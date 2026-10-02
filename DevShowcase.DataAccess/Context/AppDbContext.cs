using DevShowcase.DataAccess.Entities;
using Microsoft.EntityFrameworkCore;

namespace DevShowcase.DataAccess.Context;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<ContactInquiry> ContactInquiries => Set<ContactInquiry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ContactInquiry>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FullName).IsRequired().HasMaxLength(120);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(150);
            entity.Property(e => e.Phone).IsRequired().HasMaxLength(11);
            entity.Property(e => e.Topic).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Message).IsRequired().HasMaxLength(2000);
        });
    }
}