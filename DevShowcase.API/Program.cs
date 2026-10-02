using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using DevShowcase.Business.Interfaces;
using DevShowcase.Business.Services;
using DevShowcase.DataAccess.Context;
using DevShowcase.DataAccess.Repositories;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Veritabanı Bağlantısı (PostgreSQL)
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Dependency Injection Kayıtları
builder.Services.AddScoped<IContactInquiryRepository, ContactInquiryRepository>();
builder.Services.AddScoped<IContactService, ContactService>();

// CORS Yapılandırması (Vercel ve Localhost için tam izin)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReact", policy =>
    {
        policy.SetIsOriginAllowed(origin => true) // Vercel canlı domaini ve preview linklerinin tümüne izin verir
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// IP Bazlı Anti-Spam Rate Limiting (Dakikada en fazla 2 istek)
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddPolicy("contact-limit", httpContext =>
    {
        var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown_ip";

        return RateLimitPartition.GetFixedWindowLimiter(clientIp, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 2,
            Window = TimeSpan.FromMinutes(1),
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = 0
        });
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Swagger (Canlı ortamda da test edebilmek için if bloğu kaldırıldı)
app.UseSwagger();
app.UseSwaggerUI();

// Middleware Sıralaması (Kritik: UseCors en başta olmalıdır)
app.UseCors("AllowReact");

app.UseRateLimiter();

app.UseAuthorization();
app.MapControllers();

app.Run();