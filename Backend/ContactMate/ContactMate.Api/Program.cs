using ContactMate.Api.Configurations;
using ContactMate.Api.Endpoints;
using ContactMate.Api.Middlewares;

namespace ContactMate.Api
{
    public static class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container.
            builder.ConfigureDatabase();
            builder.RegisterServices();
            builder.ConfigureSerilog();
            builder.ConfigurationJwtAuth();

            builder.Services.AddControllers();
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();
            //builder.Services.AddMemoryCache();
            //builder.Services.AddResponseCaching();

            // CORS configuration (already present)
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowAll", policy =>
                {
                    policy.AllowAnyOrigin()
                          .AllowAnyMethod()
                          .AllowAnyHeader();
                });
            });

            var app = builder.Build();

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            //app.UseMiddleware<NightBlockMiddleware>();
            app.UseMiddleware<GlobalExceptionMiddleware>();

            app.UseHttpsRedirection();

            app.UseAuthentication();
            app.UseAuthorization();

            // Apply CORS policy
            app.UseCors("AllowAll");

            app.MapControllers();

            app.MapAuthEndpoints();
            app.MapContactEndpoints();
            app.MapAdminEndpoints();
            app.MapRoleEndpoints();

            app.Run();
        }
    }
}