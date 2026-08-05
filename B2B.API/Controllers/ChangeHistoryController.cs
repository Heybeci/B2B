using Microsoft.AspNetCore.Mvc;
using B2B.API.Dtos;
using B2B.API.Models;
using B2B.API.Services;

namespace B2B.API.Controllers;

[ApiController]
[Route("api/history")]
public class ChangeHistoryController(ChangeHistoryService changeHistoryService) : ControllerBase
{
    [RequirePermission(Permissions.HotelsManage)]
    [HttpGet]
    public Task<List<ChangeHistoryDto>> List([FromQuery] int hotelId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50) =>
        changeHistoryService.ListAsync(hotelId, page, pageSize);

    [RequirePermission(Permissions.HotelsManage)]
    [HttpPost("{id:int}/undo")]
    public Task<object> Undo(int id) => changeHistoryService.UndoAsync(id, User.GetUserId());
}
