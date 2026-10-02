using System.Threading.Tasks;
using DevShowcase.Business.Interfaces;
using DevShowcase.DataAccess.DTOs;
using DevShowcase.DataAccess.Entities;
using DevShowcase.DataAccess.Repositories;
using Microsoft.Extensions.Configuration;

namespace DevShowcase.Business.Services;

public class ContactService : IContactService
{
    private readonly IContactInquiryRepository _repository;
    private readonly IConfiguration _config;

    public ContactService(IContactInquiryRepository repository, IConfiguration config)
    {
        _repository = repository;
        _config = config;
    }

    public async Task<bool> SubmitInquiryAsync(ContactInquiryCreateDto dto)
    {
        var inquiry = new ContactInquiry
        {
            FullName = dto.FullName,
            Email = dto.Email,
            Phone = dto.Phone,
            Topic = dto.Topic,
            Message = dto.Message
        };

        await _repository.AddAsync(inquiry);
        await _repository.SaveChangesAsync();

        return true;
    }
}