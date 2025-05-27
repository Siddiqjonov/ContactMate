namespace ContactMate.Dal.Entities;

public class UserRole
{
    public long UserRoleId { get; set; }
    public string UserRoleName { get; set; }
    public string Description { get; set; }

    public ICollection<User> Users { get; set; }
}
