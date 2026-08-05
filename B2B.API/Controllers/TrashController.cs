using Microsoft.AspNetCore.Mvc;
using B2B.API.Dtos;
using B2B.API.Models;
using B2B.API.Services;

namespace B2B.API.Controllers;

// No class-level [RequirePermission] — same reasoning as HotelsController:
// stacking a class-level filter with a method-level one runs both (AND), and
// this controller needs two different permissions across its actions.
[ApiController]
[Route("api/trash")]
public class TrashController(FolderService folderService, FileService fileService) : ControllerBase
{
    [RequirePermission(Permissions.HotelsManage)]
    [HttpGet]
    public async Task<ActionResult<TrashListDto>> List([FromQuery] int hotelId)
    {
        var folders = await folderService.ListTrashAsync(hotelId);
        var files = await fileService.ListTrashAsync(hotelId);
        return new TrashListDto(folders, files);
    }

    [RequirePermission(Permissions.HotelsManage)]
    [HttpPost("folders/{id:int}/restore")]
    public Task<FolderDto> RestoreFolder(int id) => folderService.RestoreAsync(id, User.GetUserId());

    [RequirePermission(Permissions.HotelsManage)]
    [HttpPost("files/{id:int}/restore")]
    public Task<FileDto> RestoreFile(int id) => fileService.RestoreAsync(id, User.GetUserId());

    [RequirePermission(Permissions.HotelsDelete)]
    [HttpDelete("folders/{id:int}")]
    public async Task<IActionResult> PurgeFolder(int id)
    {
        await folderService.PurgeAsync(id);
        return NoContent();
    }

    [RequirePermission(Permissions.HotelsDelete)]
    [HttpDelete("files/{id:int}")]
    public async Task<IActionResult> PurgeFile(int id)
    {
        await fileService.PurgeAsync(id);
        return NoContent();
    }
}
