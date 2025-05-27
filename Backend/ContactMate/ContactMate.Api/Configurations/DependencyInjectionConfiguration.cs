using ContactMate.Bll.Helpers;
using ContactMate.Bll.Services;

namespace ContactMate.Api.Configurations;

public static class DependencyInjectionConfiguration
{
    public static void RegisterServices(this WebApplicationBuilder builder)
    {
        builder.Services.AddScoped<ITokenService, TokenService>();
        builder.Services.AddScoped<IAuthService, AuthService>();
        builder.Services.AddScoped<IContactService, ContactService>();
        builder.Services.AddScoped<IUserRoleService, UserRoleService>();
        builder.Services.AddScoped<IUserService, UserService>();
    }
}
