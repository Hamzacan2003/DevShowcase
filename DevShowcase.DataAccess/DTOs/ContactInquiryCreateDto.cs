using System.ComponentModel.DataAnnotations;

namespace DevShowcase.DataAccess.DTOs;

public record ContactInquiryCreateDto(
    [Required(ErrorMessage = "Ad Soyad zorunludur.")]
    [MaxLength(120)]
    string FullName,

    [Required(ErrorMessage = "E-posta zorunludur.")]
    [EmailAddress(ErrorMessage = "Geçerli bir e-posta giriniz.")]
    [MaxLength(150)]
    string Email,

    [Required(ErrorMessage = "Telefon numarası zorunludur.")]
    [RegularExpression(@"^[0-9]{11}$", ErrorMessage = "Telefon 11 haneli rakam olmalıdır (Örn: 05xxxxxxxxx).")]
    string Phone,

    [Required(ErrorMessage = "Konu zorunludur.")]
    [MaxLength(100)]
    string Topic,

    [Required(ErrorMessage = "Mesaj zorunludur.")]
    [MaxLength(2000)]
    string Message
);