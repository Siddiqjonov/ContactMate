using ContactMate.Bll.Dtos;

namespace ContactMate.Bll.Services;

public interface IUserService
{
    Task DeleteUserByUserIdAsync(long userId, string userRoleName);
    Task UpdateUserRoleAsync(long userId, long userRoleId, string userRoleName);
    Task<UserGetDto> GetUserByUserIdAsync(long userId);
}