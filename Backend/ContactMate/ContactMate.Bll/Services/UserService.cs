using ContactMate.Core.Errors;
using ContactMate.Dal;
using ContactMate.Dal.Entities;
using Microsoft.EntityFrameworkCore;

namespace ContactMate.Bll.Services;

public class UserService : IUserService
{
    private readonly MainContext MainContext;

    public UserService(MainContext mainContext)
    {
        MainContext = mainContext;
    }

    public async Task DeleteUserByRoleAsync(long userId, string userRoleName)
    {
        if (userRoleName == "SuperAdmin")
        {
            await DeleteUserById(userId);
        }
        else if (userRoleName == "Admin")
        {
            var user = await SelectUserByIdAsync(userId);

            if (user.UserRole.UserRoleName == "User" && user.UserId == userId)
            {
                await DeleteUserById(userId);
            }
            else
            {
                throw new NotAllowedException("Admin can not delete admin");
            }
        }
        else
        {
            throw new ForbiddenException("Access forbidden to users");
        }
    }

    public async Task UpdateUserRoleAsync(long userId, long userRoleId, string userRoleName)
    {
        await (userRoleName == "SuperAdmin"
            ? PatchUserRoleAsync(userId, userRoleId)
            : throw new NotAllowedException("Updating is not allowed for Users or Admin"));
    }

    // -----------------------------------------

    private async Task DeleteUserById(long userId)
    {
        var user = await SelectUserByIdAsync(userId);
        MainContext.Users.Remove(user);
        await MainContext.SaveChangesAsync();
    }

    private async Task<User> SelectUserByIdAsync(long userId)
    {
        var user = await MainContext.Users.Include(u => u.UserRole).FirstOrDefaultAsync(u => u.UserId == userId);
        return user ?? throw new EntityNotFoundException($"User with userId {userId} not found");
    }

    private async Task PatchUserRoleAsync(long userId, long userRoleId)
    {
        var user = await SelectUserByIdAsync(userId);
        user.UserRoleId = userRoleId;
        MainContext.Users.Update(user);
        await MainContext.SaveChangesAsync();
    }
}
