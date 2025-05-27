using Serilog;

namespace ContactMate.Api.Configurations;

public static class SerilogConfiguration
{
    public static void ConfigureSerilog(this WebApplicationBuilder builder)
    {
        var config = builder.Configuration;

        Log.Logger = new LoggerConfiguration()
            .ReadFrom.Configuration(config)
            .CreateLogger();

        builder.Logging.ClearProviders();
        builder.Logging.AddSerilog();
    }
}
