using ContactMate.Core.Errors;
using System.Net;
using System.Text.Json;

namespace ContactMate.Api.Middlewares;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task Invoke(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            //_logger.LogError(ex, "Unhandeled exception occurred");
            //_logger.LogError(ex, "Exception occurred: {Message}", ex.Message); // for both

            _logger.LogError("Exception: {Message}", ex.Message);

            int code = ex switch
            {
                ForbiddenException => 403,
                InvalidArgumentException => 422,
                NotFoundException or DirectoryNotFoundException or EntityNotFoundException => 404,
                AuthException or UnauthorizedException => 401,
                NotAllowedException => 403,
                ValidationFailedException => 400,
                _ => (int)HttpStatusCode.InternalServerError
            };

            //context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

            context.Response.StatusCode = code;
            context.Response.ContentType = "application/json";

            var response = new { error = ex.Message };
            var json = JsonSerializer.Serialize(response);
            await context.Response.WriteAsync(json);

            //await context.Response.WriteAsJsonAsync(new { error = ex.Message });
        }
    }
}

