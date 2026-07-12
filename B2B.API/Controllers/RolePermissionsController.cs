using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using B2B.API.Dtos;
using B2B.API.Services;

namespace B2B.API.Controllers;

// Managing role permissions is intentionally NOT itself permission-gated —
// only Sistem Yöneticisi (admin) can touch this, hardcoded, so a role can
// never grant itself more power via the very system it controls.
[ApiController]
[Route("api/role-permissions")]
[Authorize(Roles = "admin")]
public class RolePermissionsController(PermissionService permissionService) : ControllerBase
{
    [HttpGet]
    public Task<RolePermissionsDto> Get() => permissionService.GetMatrixAsync();

    [HttpPut]
    public Task<RolePermissionsDto> Update(UpdateRolePermissionsRequest input) => permissionService.UpdateAsync(input);
}
