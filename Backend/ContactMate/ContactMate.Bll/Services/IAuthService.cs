using ContactMate.Bll.Dtos;

namespace ContactMate.Bll.Services;

public interface IAuthService
{
    Task<long> SignUpUserAsync(UserCreateDto userCreateDto);
    Task<LogInResponseDto> LoginUserAsync(UserLogInDto userLogInDto);
    Task<LogInResponseDto> RefreshTokenAsync(RefreshRequestDto request);
    Task LogOutAsync(string token);
}