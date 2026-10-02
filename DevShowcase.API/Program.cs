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

// CORS Yapılandırması
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReact", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// 1. IP BAZLI ANTI-SPAM RATE LIMITING
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddPolicy("contact-limit", httpContext =>
    {
        var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown_ip";

        return RateLimitPartition.GetFixedWindowLimiter(clientIp, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 2,                          // 1 dakikada izin verilen istek sayısı
            Window = TimeSpan.FromMinutes(1),          // Zaman aralığı
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = 0                            // Kuyruk yok, direkt 429 kes
        });
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Middleware Sıralaması
app.UseCors("AllowReact");

app.UseRateLimiter(); // Rate Limiter Devrede

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();