using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using DevShowcase.DataAccess.Context;
using DevShowcase.DataAccess.Entities;
using Microsoft.EntityFrameworkCore;

namespace DevShowcase.DataAccess.Repositories;

// Interface doğrudan burada tanımlı
public interface IContactInquiryRepository
{
    Task AddAsync(ContactInquiry inquiry);
    Task<List<ContactInquiry>> GetAllAsync();
    Task<int> SaveChangesAsync();
}

public class ContactInquiryRepository : IContactInquiryRepository
{
    private readonly AppDbContext _context;

    public ContactInquiryRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(ContactInquiry inquiry) => await _context.ContactInquiries.AddAsync(inquiry);

    public async Task<List<ContactInquiry>> GetAllAsync() =>
        await _context.ContactInquiries.OrderByDescending(x => x.CreatedAt).ToListAsync();

    public async Task<int> SaveChangesAsync() => await _context.SaveChangesAsync();
}