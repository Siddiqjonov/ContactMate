namespace ContactMate.Dal.EntityConfigurations;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ContactMate.Dal.Entities;

public class UserRoleConfiguration : IEntityTypeConfiguration<UserRole>
{
    public void Configure(EntityTypeBuilder<UserRole> builder)
    {
        builder.HasKey(ur => ur.UserRoleId);

        builder.Property(ur => ur.UserRoleName)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(ur => ur.Description)
            .HasMaxLength(200);
    }
}

