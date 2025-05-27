using ContactMate.Bll.Dtos;

namespace ContactMate.Bll.Services;

public interface IUserService
{
    Task DeleteUserByRoleAsync(long userId, string userRoleName);
    Task UpdateUserRoleAsync(long userId, long userRoleId, string userRoleName);
}