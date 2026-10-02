using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace DevShowcase.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [EnableRateLimiting("contact-limit")]
    public class ContactController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private static readonly HttpClient _httpClient = new HttpClient();

        public ContactController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public class ContactInquiryDto
        {
            public string FullName { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
            public string Phone { get; set; } = string.Empty;
            public string Topic { get; set; } = string.Empty;
            public string Message { get; set; } = string.Empty;
            public string? Honeypot { get; set; }
        }

        [HttpPost]
        public async Task<IActionResult> Post([FromBody] ContactInquiryDto dto)
        {
            // Honeypot bot tuzağı kontrolü
            if (!string.IsNullOrEmpty(dto.Honeypot))
            {
                return Ok(new { success = true, message = "Mesajınız başarıyla iletildi." });
            }

            try
            {
                // Resend API Anahtarı (Render Environment'tan veya appsettings'ten okunur)
                string apiKey = _configuration["RESEND_API_KEY"]
                                ?? _configuration["MailSettings:ResendApiKey"]
                                ?? string.Empty;

                // Tablo Formatındaki Şık HTML E-posta Şablonu
                string htmlBody = $@"
                <div style='font-family: Arial, sans-serif; background-color: #040812; padding: 30px; color: #f8fafc;'>
                    <div style='max-width: 620px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; border: 1px solid #1e293b; padding: 28px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);'>
                        <div style='border-bottom: 2px solid #00f2fe; padding-bottom: 12px; margin-bottom: 20px;'>
                            <h2 style='color: #ffffff; margin: 0; font-size: 22px;'>🚀 Yeni Portfolyo Mesajı</h2>
                            <p style='color: #00f2fe; font-size: 13px; margin: 5px 0 0 0; font-family: monospace;'>Portfolio Contact Form</p>
                        </div>
                        <table style='width: 100%; border-collapse: collapse; margin-top: 15px;'>
                            <tr style='background-color: #090e1a;'>
                                <td style='padding: 12px; font-weight: bold; width: 28%; border: 1px solid #1e293b; color: #38bdf8;'>Adı Soyadı:</td>
                                <td style='padding: 12px; border: 1px solid #1e293b; color: #f8fafc; font-size: 15px;'>{dto.FullName}</td>
                            </tr>
                            <tr>
                                <td style='padding: 12px; font-weight: bold; border: 1px solid #1e293b; color: #38bdf8;'>E-Posta:</td>
                                <td style='padding: 12px; border: 1px solid #1e293b;'>
                                    <a href='mailto:{dto.Email}' style='color: #00f2fe; text-decoration: none;'>{dto.Email}</a>
                                </td>
                            </tr>
                            <tr style='background-color: #090e1a;'>
                                <td style='padding: 12px; font-weight: bold; border: 1px solid #1e293b; color: #38bdf8;'>Telefon:</td>
                                <td style='padding: 12px; border: 1px solid #1e293b; color: #f8fafc; font-family: monospace;'>{dto.Phone}</td>
                            </tr>
                            <tr>
                                <td style='padding: 12px; font-weight: bold; border: 1px solid #1e293b; color: #38bdf8;'>Talep Konusu:</td>
                                <td style='padding: 12px; border: 1px solid #1e293b; color: #facc15; font-weight: bold;'>{dto.Topic}</td>
                            </tr>
                            <tr style='background-color: #090e1a;'>
                                <td style='padding: 12px; font-weight: bold; vertical-align: top; border: 1px solid #1e293b; color: #38bdf8;'>Mesaj İçeriği:</td>
                                <td style='padding: 12px; border: 1px solid #1e293b; color: #e2e8f0; white-space: pre-line; line-height: 1.5;'>{dto.Message}</td>
                            </tr>
                        </table>
                    </div>
                </div>";

                // Resend Payload: Alıcı kesin olarak doğrulanmış 'hamzacana98@gmail.com' adresi yapıldı
                var emailPayload = new
                {
                    from = "Portfolio <onboarding@resend.dev>",
                    to = new[] { "hamzacana98@gmail.com" },
                    reply_to = dto.Email,
                    subject = $"[Yeni Talep] {dto.Topic} - {dto.FullName}",
                    html = htmlBody
                };

                var requestMessage = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails");
                requestMessage.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
                requestMessage.Content = new StringContent(JsonSerializer.Serialize(emailPayload), Encoding.UTF8, "application/json");

                var response = await _httpClient.SendAsync(requestMessage);

                if (response.IsSuccessStatusCode)
                {
                    return Ok(new { success = true, message = "Mesajınız başarıyla iletildi." });
                }

                var errorContent = await response.Content.ReadAsStringAsync();
                return StatusCode(500, new { success = false, message = "Resend API Hatası: " + errorContent });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Hata: " + ex.Message });
            }
        }
    }
}