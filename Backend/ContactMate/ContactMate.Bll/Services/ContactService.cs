using ContactMate.Bll.Dtos;
using ContactMate.Bll.FluentValidations;
using ContactMate.Core.Errors;
using ContactMate.Dal;
using ContactMate.Dal.Entities;
using Microsoft.EntityFrameworkCore;

namespace ContactMate.Bll.Services;

public class ContactService : IContactService
{
    private readonly MainContext MainContext;

    public ContactService(MainContext mainContext)
    {
        MainContext = mainContext;
    }

    public async Task<long> AddContactAsync(ContactCreateDto contactCreateDto, long userId)
    {
        var contactValidator = new ContactCreateDtoValidator();
        var result = contactValidator.Validate(contactCreateDto);

        if (!result.IsValid)
        {
            var errors = "";
            foreach (var error in result.Errors)
            {
                errors = errors + "\n" + error.ErrorMessage;
            }
            throw new ValidationFailedException(errors);
        }

        var contact = new Contact()
        {
            FirstName = contactCreateDto.FirstName,
            LastName = contactCreateDto.LastName,
            FullName = contactCreateDto.FirstName + " " + contactCreateDto.LastName,
            Email = contactCreateDto.Email,
            PhoneNumber = contactCreateDto.PhoneNumber,
            Address = contactCreateDto.Address,
            CreatedAt = DateTime.UtcNow,
            UserId = userId,
        };

        var contactId = await InsertContactAsync(contact);
        return contactId;
    }

    public async Task DeleteContactAsync(long contactId, long userId)
    {
        var contactOfUser = await SelectAllContacts().Include(u => u.User)
            .FirstOrDefaultAsync(c => c.Id == contactId && c.UserId == userId);
        if (contactOfUser is null)
            throw new InvalidArgumentException($"Contact with contactId: {contactId} does not belong to user with userId: {userId}");
        await DeleteContactAsync(contactOfUser);
    }

    public async Task<ICollection<ContactDto>> GetAllContactstAsync(long userId)
    {
        var contacts = await SelectAllUserContactsAsync(userId);

        var contactsDto = contacts.Select(contact => ConvertToContactDto(contact));
        return contactsDto.ToList();
    }

    private ContactDto ConvertToContactDto(Contact contact)
    {
        return new ContactDto()
        {
            ContactId = contact.Id,
            FirstName = contact.FirstName,
            LastName = contact.LastName,
            Email = contact.Email,
            PhoneNumber = contact.PhoneNumber,
            Address = contact.Address,
        };
    }

    public async Task<ContactDto> GetContactByContacIdAsync(long contactId, long userId)
    {
        var contact = await SelectContactByContactIdAsync(contactId);
        var contactDto = ConvertToContactDto(contact);
        if (contact.User.UserId == userId)
            return contactDto;
        else
            throw new NotAllowedException($"Contact does not belong to user with userId: {userId}");
    }

    public async Task UpdateContactAsync(ContactDto contactDto, long userId)
    {
        var contactDtoValidator = new ContactDtoValidator();
        var result = contactDtoValidator.Validate(contactDto);

        if (!result.IsValid)
        {
            var errors = "";
            foreach (var error in result.Errors)
            {
                errors = errors + "\n" + error.ErrorMessage;
            }
            throw new ValidationFailedException(errors);
        }

        var contactOfUser = await SelectAllContacts().Include(c => c.User)
            .FirstOrDefaultAsync(c => c.Id == contactDto.ContactId && c.UserId == userId);
        if (contactOfUser is null)
            throw new NotAllowedException($"Contact with contactId: {contactDto.ContactId} does not belong to user with userId: {userId}");
        else
        {
            contactOfUser.FirstName = contactDto.FirstName;
            contactOfUser.LastName = contactDto.LastName;
            contactOfUser.FullName = contactDto.FirstName + " " + contactDto.LastName;
            contactOfUser.Email = contactDto.Email;
            contactOfUser.PhoneNumber = contactDto.PhoneNumber;
            contactOfUser.Address = contactDto.Address;
        }
        
        await UpdateContactAsync(contactOfUser);
    }


    //----------------------------------------------------


    private async Task DeleteContactAsync(Contact contact)
    {
        MainContext.Contacts.Remove(contact);
        await MainContext.SaveChangesAsync();
    }

    private async Task<long> InsertContactAsync(Contact contact)
    {
        await MainContext.Contacts.AddAsync(contact);
        await MainContext.SaveChangesAsync();
        return contact.Id;
    }

    private IQueryable<Contact> SelectAllContacts()
    {
        return MainContext.Contacts;
    }

    private async Task<ICollection<Contact>> SelectAllUserContactsAsync(long userId)
    {
        var contacts = await MainContext.Contacts.Where(c => c.UserId == userId).ToListAsync();
        return contacts;
    }

    private async Task<Contact> SelectContactByContactIdAsync(long contactId)
    {
        var contact = await MainContext.Contacts.Include(c => c.User).FirstOrDefaultAsync(c => c.Id == contactId);
        return contact == null ? throw new EntityNotFoundException($"Contact wiht contactId {contactId} not found") : contact;
    }

    private async Task UpdateContactAsync(Contact contact)
    {
        MainContext.Contacts.Update(contact);
        await MainContext.SaveChangesAsync();
    }
}
