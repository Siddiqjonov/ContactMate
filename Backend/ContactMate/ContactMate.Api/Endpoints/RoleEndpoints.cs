using ContactMate.Bll.Dtos;
using ContactMate.Bll.Services;
using ContactMate.Core.Errors;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Data;
using System.Security.Claims;

namespace ContactMate.Api.Endpoints;

public static class RoleEndpoints
{
    public static void MapRoleEndpoints(this WebApplication app)
    {
        var userGroup = app.MapGroup("/api/role")
            .RequireAuthorization()
            .WithTags("UserRole Management");

        userGroup.MapPost("/post", [Authorize(Roles = "SuperAdmin")]
        async (UserRoleCreateDto userRoleCreateDto, IUserRoleService _userRoleService, HttpContext context) =>
        {
            //var userRoleName = context.User.FindFirst("Role")?.Value;
            var userRoleName = context.User.FindFirst(ClaimTypes.Role)?.Value;
            if (userRoleName == null)
                throw new NotAllowedException("Access allowed to SuperAdmin!");
            var userRoleId = await _userRoleService.AddUserRoleAsync(userRoleCreateDto, userRoleName);
            return Results.Ok(userRoleId);
        })
        .WithName("AddUserRole");


        userGroup.MapGet("/getAll", [Authorize(Roles = "Admin, SuperAdmin")]
        async (IUserRoleService _userRoleService) =>
        {
            var roles = await _userRoleService.GetAllRolesAsync();
            return Results.Ok(roles);
        })
          .WithName("GetAllUsers");


        userGroup.MapDelete("/deleteById", [Authorize(Roles = "SuperAdmin")]
        async (HttpContext context, long userRoleId, IUserRoleService _userRoleService) =>
        {
            var userRoleName = context.User.FindFirst(ClaimTypes.Role)?.Value;
            //var userRoleName = context.User.FindFirst("Role")?.Value;
            if (userRoleName == null)
                throw new NotAllowedException("Access allowed to SuperAdmin!");

            await _userRoleService.DeleteUserRoleByIdAsync(userRoleId, userRoleName);
            return Results.Ok();
        })
            .WithName("DeleteUserRoleById");
    }
}
