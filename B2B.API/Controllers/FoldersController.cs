using Microsoft.AspNetCore.Mvc;
using B2B.API.Dtos;
using B2B.API.Models;
using B2B.API.Services;

namespace B2B.API.Controllers;

[ApiController]
[Route("api/folders")]
[RequirePermission(Permissions.HotelsManage)]
public class FoldersController(FolderService folderService) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<FolderDto>> Create(CreateFolderRequest input) =>
        StatusCode(201, await folderService.CreateAsync(input, User.GetUserId()));

    [HttpPatch("{id:int}")]
    public Task<FolderDto> Rename(int id, RenameFolderRequest input) => folderService.RenameAsync(id, input);

    [HttpPatch("{id:int}/move")]
    public Task<FolderDto> Move(int id, MoveFolderRequest input) => folderService.MoveAsync(id, input.NewParentFolderId);

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        await folderService.DeleteAsync(id);
        return NoContent();
    }
}
