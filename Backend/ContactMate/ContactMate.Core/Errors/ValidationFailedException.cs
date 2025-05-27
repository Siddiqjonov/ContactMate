using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.Text;
using System.Threading.Tasks;

namespace ContactMate.Core.Errors;

public class ValidationFailedException : BaseException
{
    public ValidationFailedException() { }
    public ValidationFailedException(String message) : base(message) { }
    public ValidationFailedException(String message, Exception inner) : base(message, inner) { }
    protected ValidationFailedException(SerializationInfo info, StreamingContext context) : base(info, context) { }
}
