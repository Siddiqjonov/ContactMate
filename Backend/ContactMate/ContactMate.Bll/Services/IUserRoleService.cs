using ContactMate.Bll.Dtos;

namespace ContactMate.Bll.Services;

public interface IUserRoleService
{
    Task<ICollection<UserRoleDto>> GetAllRolesAsync();
    Task<ICollection<UserGetDto>> GetAllUsersByRoleNameAsync(string roleName);
    Task<long> AddUserRoleAsync(UserRoleCreateDto userRoleCreateDto, string userRoleName);
    Task DeleteUserRoleByIdAsync(long userRoleId, string userRoleName);
}