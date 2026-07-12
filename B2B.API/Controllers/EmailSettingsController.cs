using Microsoft.AspNetCore.Mvc;
using B2B.API.Dtos;
using B2B.API.Models;
using B2B.API.Services;

namespace B2B.API.Controllers;

[ApiController]
[Route("api/settings/email")]
[RequirePermission(Permissions.EmailSettingsManage)]
public class EmailSettingsController(EmailSettingsService emailSettingsService) : ControllerBase
{
    [HttpGet]
    public Task<EmailSettingsDto> Get() => emailSettingsService.GetAsync();

    [HttpPut]
    public Task<EmailSettingsDto> Update(UpdateEmailSettingsRequest input) => emailSettingsService.UpdateAsync(input);
}
