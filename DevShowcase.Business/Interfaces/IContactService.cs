using System.Threading.Tasks;
using DevShowcase.DataAccess.DTOs;

namespace DevShowcase.Business.Interfaces;

public interface IContactService
{
    Task<bool> SubmitInquiryAsync(ContactInquiryCreateDto dto);
}