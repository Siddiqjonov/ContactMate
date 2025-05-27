using ContactMate.Bll.Dtos;
using ContactMate.Bll.Services;
using ContactMate.Core.Errors;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using System.Security.Claims;

namespace ContactMate.Api.Endpoints;

public static class AdminEndpoints
{
    public static void MapAdminEndpoints(this WebApplication app)
    {
        var userGroup = app.MapGroup("/api/admin")
            .RequireAuthorization()
            .WithTags("Admin endpoints");

        userGroup.MapGet("/getUsersByRole",
            [Authorize(Roles = "Admin, SuperAdmin")]
        async (string role, IUserRoleService _userRoleService) =>
            {
                var users = await _userRoleService.GetAllUsersByRoleNameAsync(role);
                return Results.Ok(users);
            })
        .WithName("GetUsersByRole");

        userGroup.MapDelete("/delete", [Authorize(Roles = "Admin, SuperAdmin")]
        async (long userId, HttpContext httpContext, IUserService userService) =>
        {
            var userRoleName = httpContext.User.FindFirst(ClaimTypes.Role)?.Value;
            await userService.DeleteUserByRoleAsync(userId, userRoleName);
            return Results.Ok();
        })
        .WithName("DeleteUserByRole");

        userGroup.MapPatch("/changeRole", [Authorize(Roles = "SuperAdmin")]
        async (long userId, long userRoleId, IUserService userService, HttpContext httpContext) =>
        {
            var userRoleName = httpContext.User.FindFirst(ClaimTypes.Role)?.Value;
            if (userRoleName == null)
                throw new NotAllowedException("Invalid token");

            await userService.UpdateUserRoleAsync(userId, userRoleId, userRoleName);
            return Results.Ok();
        })
        .WithName("UpdateUserRole");
    }
}
