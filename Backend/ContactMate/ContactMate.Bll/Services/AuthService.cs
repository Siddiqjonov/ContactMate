using ContactMate.Bll.Dtos;
using ContactMate.Bll.FluentValidations;
using ContactMate.Bll.Helpers;
using ContactMate.Bll.Helpers.Security;
using ContactMate.Core.Errors;
using ContactMate.Dal;
using ContactMate.Dal.Entities;
using Microsoft.EntityFrameworkCore;

namespace ContactMate.Bll.Services;

public class AuthService : IAuthService
{
    private readonly ITokenService TokenService;
    private readonly MainContext MainContext;

    public AuthService(ITokenService tokenService,
        MainContext mainContext)
    {
        TokenService = tokenService;
        MainContext = mainContext;
    }

    public async Task<LogInResponseDto> LoginUserAsync(UserLogInDto userLogInDto)
    {
        var logInValidator = new UserLogInDtoValidator();
        var result = logInValidator.Validate(userLogInDto);

        if (!result.IsValid)
        {
            var errors = "";
            foreach (var error in result.Errors)
            {
                errors = errors + "\n" + error.ErrorMessage;
            }
            throw new ValidationFailedException(errors);
        }

        var user = await SelectUserByUserNameAsync(userLogInDto.UserName);

        var checkUserPassword = PasswordHasher.Verify(userLogInDto.Password, user.Password, user.Salt);
        if (checkUserPassword == false)
        {
            throw new UnauthorizedException("User or password incorrect");
        }

        var userGetDto = new UserGetDto()
        {
            UserId = user.UserId,
            UserName = user.UserName,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            Role = user.UserRole.UserRoleName,
        };

        var token = TokenService.GenerateTokent(userGetDto);
        var existingToken = await SelectActiveTokenByUserIdAsync(user.UserId);

        var loginResponseDto = new LogInResponseDto()
        {
            AccessToken = token,
            TokenType = "Bearer",
            Expires = 24,
        };

        if (existingToken == null)
        {
            var refreshToken = TokenService.GenerateRefreshToken();
            var refreshTokenToDB = new RefreshToken()
            {
                Token = refreshToken,
                Expires = DateTime.UtcNow.AddDays(21),
                IsRevoked = false,
                UserId = user.UserId,
            };

            await InsertRefreshTokenAsync(refreshTokenToDB);

            loginResponseDto.RefreshToken = refreshToken;
        }
        else
        {
            loginResponseDto.RefreshToken = existingToken.Token;
        }

        return loginResponseDto;
    }

    public async Task LogOutAsync(string token)
    {
        await RemoveRefreshTokenAsync(token);
    }

    public async Task<LogInResponseDto> RefreshTokenAsync(RefreshRequestDto request)
    {
        var principal = TokenService.GetPrincipalFromExpiredToken(request.AccessToken);
        if (principal == null) throw new ForbiddenException("Invalid Access token");

        var userClaim = principal.FindFirst(c => c.Type == "UserId");
        var userId = long.Parse(userClaim.Value);

        var refreshToken = await SelectRefreshTokenAsync(request.RefreshToken, userId);
        if (refreshToken == null || refreshToken.Expires < DateTime.UtcNow || refreshToken.IsRevoked)
            throw new UnauthorizedAccessException("Invalid or expired refresh token");

        // make refresh token used
        refreshToken.IsRevoked = true;

        var user = await SelectUserByIdAsync(userId);

        var userGetDto = new UserGetDto()
        {
            UserId = user.UserId,
            FirstName = user.FirstName,
            LastName = user.LastName,
            UserName = user.LastName,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            Role = user.UserRole.UserRoleName,
        };

        // issue new tokens
        var newAccessToken = TokenService.GenerateTokent(userGetDto);
        var newRefreshToken = TokenService.GenerateRefreshToken();

        var refreshTokenToDB = new RefreshToken()
        {
            Token = newRefreshToken,
            Expires = DateTime.UtcNow.AddDays(21),
            IsRevoked = false,
            UserId = user.UserId,
        };

        await InsertRefreshTokenAsync(refreshTokenToDB);

        return new LogInResponseDto()
        {
            AccessToken = newAccessToken,
            TokenType = "Bearer",
            RefreshToken = newRefreshToken,
            Expires = 900,
        };
    }

    public async Task<long> SignUpUserAsync(UserCreateDto userCreateDto)
    {
        var userValidator = new UserCreateDtoValidator();
        var result = userValidator.Validate(userCreateDto);


        if (!result.IsValid)
        {
            var errors = "";
            foreach (var error in result.Errors)
            {
                errors = errors + error.ErrorMessage;
            }
            throw new ValidationFailedException(errors);
        }

        var tupleFromHasher = PasswordHasher.Hasher(userCreateDto.Password);

        var userRoleName = "User";
        var userRoleOfUser = await SelectUserRoleByRoleName(userRoleName);

        var user = new User()
        {
            FirstName = userCreateDto.FirstName,
            LastName = userCreateDto.LastName,
            UserName = userCreateDto.UserName,
            Email = userCreateDto.Email,
            PhoneNumber = userCreateDto.PhoneNumber,
            Password = tupleFromHasher.Hash,
            Salt = tupleFromHasher.Salt,
            UserRoleId = userRoleOfUser.UserRoleId,
        };

        return await InsertUserAsync(user);
    }

    private async Task<UserRole> SelectUserRoleByRoleName(string userRoleName)
    {
        var userRole = await MainContext.UserRoles.FirstOrDefaultAsync(uR => uR.UserRoleName == userRoleName);
        return userRole == null ? throw new EntityNotFoundException($"Role with role name: {userRoleName} not found") : userRole;
    }

    //-------------------------------------------------------------


    private async Task InsertRefreshTokenAsync(RefreshToken refreshToken)
    {
        await MainContext.RefreshTokens.AddAsync(refreshToken);
        await MainContext.SaveChangesAsync();
    }

    private async Task<RefreshToken?> SelectActiveTokenByUserIdAsync(long userId)
    {
        RefreshToken? refreshToke;
        try
        {
            refreshToke = await MainContext.RefreshTokens
            .Include(rf => rf.User)
            .SingleOrDefaultAsync(rf => rf.UserId == userId && rf.IsRevoked == false && rf.Expires > DateTime.UtcNow);
        }
        catch (InvalidOperationException ex)
        {
            throw new DuplicateEntryException($"2 or more active refreshToken found with userId: {userId} found!\nAnd {ex.Message}");
        }
        return refreshToke;
    }

    private async Task<RefreshToken> SelectRefreshTokenAsync(string refreshToken, long userId)
    {
        var refToken = await MainContext.RefreshTokens.FirstOrDefaultAsync(rt => rt.Token == refreshToken && rt.UserId == userId);
        return refToken ?? throw new InvalidArgumentException($"RefreshToken with {userId} is invalid");
    }
    private async Task RemoveRefreshTokenAsync(string token)
    {
        var refreshToken = await MainContext.RefreshTokens.FirstOrDefaultAsync(rf => rf.Token == token);
        if (refreshToken == null) throw new EntityNotFoundException($"Refresh token: {refreshToken} not found");

        MainContext.RefreshTokens.Remove(refreshToken);
        await MainContext.SaveChangesAsync();
    }

    //--------------------------------------------------------------


    private async Task<long> InsertUserAsync(User user)
    {
        await MainContext.Users.AddAsync(user);
        await MainContext.SaveChangesAsync();
        return user.UserId;
    }

    private async Task<User> SelectUserByUserNameAsync(string userName)
    {
        var user = await MainContext.Users.Include(u => u.UserRole).FirstOrDefaultAsync(u => u.UserName == userName);
        return user ?? throw new EntityNotFoundException($"User with {userName} not found");
    }
    private async Task<User> SelectUserByIdAsync(long userId)
    {
        var user = await MainContext.Users.Include(u => u.UserRole).FirstOrDefaultAsync(u => u.UserId == userId);
        return user ?? throw new EntityNotFoundException($"User with userId {userId} not found");
    }

}
