using ContactMate.Bll.Dtos;
using ContactMate.Core.Errors;
using ContactMate.Dal;
using ContactMate.Dal.Entities;
using Microsoft.EntityFrameworkCore;

namespace ContactMate.Bll.Services;

public class UserRoleService : IUserRoleService
{
    private readonly MainContext MainContext;

    public UserRoleService(MainContext mainContext)
    {
        MainContext = mainContext;
    }

    public async Task<ICollection<UserRoleDto>> GetAllRolesAsync()
    {
        var userRoels = await SelectAllRolesAsync();

        var userRoleDto = userRoels.Select(userRole => ConverUserRoleToUserRoleDto(userRole)).ToList();
        return userRoleDto;
    }

    public async Task<ICollection<UserGetDto>> GetAllUsersByRoleNameAsync(string roleName)
    {
        var users = await SelectAllUsersByRoleNameAsync(roleName);

        var userRolesDto = users.Select(user => ConvertUserToUserGetDto(user)).ToList();
        return userRolesDto;
    }

    private UserRoleDto ConverUserRoleToUserRoleDto(UserRole userRole)
    {
        return new UserRoleDto()
        {
            UserRoleId = userRole.UserRoleId,
            UserRoleName = userRole.UserRoleName,
            Description = userRole.Description,
        };
    }

    private UserGetDto ConvertUserToUserGetDto(User user)
    {
        return new UserGetDto()
        {
            UserId = user.UserId,
            FirstName = user.FirstName,
            LastName = user.LastName,
            UserName = user.UserName,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            Role = user.UserRole.UserRoleName,
        };
    }

    public async Task<long> AddUserRoleAsync(UserRoleCreateDto userRoleCreateDto, string userRoleName)
    {
        if (userRoleName != "SuperAdmin")
            throw new NotAllowedException("Access only allowed to SuperAdmin to add user roles");

        var userRole = new UserRole()
        {
            UserRoleName = userRoleCreateDto.UserRoleName,
            Description = userRoleCreateDto.Description,
        };

        var userRoleId = await InsertUserRoleAsync(userRole);

        return userRoleId;
    }

    public async Task DeleteUserRoleByIdAsync(long userRoleId, string userRoleName)
    {
        if (userRoleName != "SuperAdmin")
            throw new NotAllowedException("Access denied for non SuperAdmins");

        var userRole = await SelectUserRoleByIdAsync(userRoleId);
        await DeleteUserRoleAsync(userRole);
    }
    
    //--------------------------------------------------


    private async Task<long> InsertUserRoleAsync(UserRole userRole)
    {
        await MainContext.UserRoles.AddAsync(userRole);
        await MainContext.SaveChangesAsync();
        return userRole.UserRoleId;
    }

    private async Task<ICollection<UserRole>> SelectAllRolesAsync()
    {
        var userRoles = await MainContext.UserRoles.ToListAsync();
        return userRoles;
    }

    private async Task<ICollection<User>> SelectAllUsersByRoleNameAsync(string roleName)
    {
        var users = await MainContext.Users.Include(u => u.UserRole).Where(u => u.UserRole.UserRoleName == roleName).ToListAsync();
        return users;
    }

    private async Task DeleteUserRoleAsync(UserRole userRole)
    {
        MainContext.UserRoles.Remove(userRole);
        await MainContext.SaveChangesAsync();
    }

    private async Task<UserRole> SelectUserRoleByIdAsync(long userRoleId)
    {
        var userRole = await MainContext.UserRoles.FirstOrDefaultAsync(ur => ur.UserRoleId == userRoleId);
        return userRole ?? throw new NotFoundException($"User role with: {userRoleId} not found");
    }
}
