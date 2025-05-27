using ContactMate.Bll.Dtos;
using FluentValidation;

namespace ContactMate.Bll.FluentValidations;

public class UserLogInDtoValidator : AbstractValidator<UserLogInDto>
{
    public UserLogInDtoValidator()
    {
        RuleFor(x => x.UserName)
            .NotEmpty().WithMessage("Username is required.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required.");
    }
}
