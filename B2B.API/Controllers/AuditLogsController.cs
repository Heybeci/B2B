using Microsoft.AspNetCore.Mvc;
using B2B.API.Dtos;
using B2B.API.Models;
using B2B.API.Services;

namespace B2B.API.Controllers;

[ApiController]
[Route("api/audit-logs")]
[RequirePermission(Permissions.AuditLogsView)]
public class AuditLogsController(AuditLogService auditLogService) : ControllerBase
{
    [HttpGet]
    public Task<List<AuditLogDto>> List([FromQuery] int page = 1, [FromQuery] int pageSize = 50) =>
        auditLogService.ListAsync(page, pageSize);
}
