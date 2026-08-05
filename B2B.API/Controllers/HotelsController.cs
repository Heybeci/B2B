using Microsoft.AspNetCore.Mvc;
using B2B.API.Dtos;
using B2B.API.Middleware;
using B2B.API.Models;
using B2B.API.Services;

namespace B2B.API.Controllers;

[ApiController]
[Route("api/hotels")]
public class HotelsController(
    HotelService hotelService,
    FolderService folderService,
    FileService fileService,
    PermissionService permissionService) : ControllerBase
{
    [HttpGet]
    public Task<List<HotelDto>> ListPublic() => hotelService.ListPublicAsync();

    [RequirePermission(Permissions.HotelsManage)]
    [HttpGet("admin/all")]
    public Task<List<HotelDto>> ListAll() => hotelService.ListAllAsync();

    [HttpGet("{id:int}")]
    public Task<HotelDto> Get(int id) => hotelService.GetAsync(id, requirePublished: !(User.Identity?.IsAuthenticated ?? false));

    [HttpGet("{hotelId:int}/browse")]
    public Task<BrowseResponseDto> Browse(int hotelId, [FromQuery] int? folderId) =>
        folderService.BrowseHotelAsync(hotelId, folderId, includeUnpublished: User.Identity?.IsAuthenticated ?? false);

    [RequirePermission(Permissions.HotelsManage)]
    [HttpPost("{hotelId:int}/files")]
    [RequestSizeLimit(2_100_000_000)]
    public async Task<ActionResult<List<FileDto>>> UploadFiles(int hotelId, [FromForm] int? folderId, IFormFileCollection files)
    {
        if (files.Count == 0) throw ApiException.BadRequest("En az bir dosya seçilmeli");
        var created = await fileService.SaveUploadedFilesAsync(hotelId, folderId, User.GetUserId(), files);
        return StatusCode(201, created);
    }

    [RequirePermission(Permissions.HotelsManage)]
    [HttpPost]
    public async Task<ActionResult<HotelDto>> Create([FromForm] CreateHotelRequest input, IFormFile? logo) =>
        StatusCode(201, await hotelService.CreateAsync(input, User.GetUserId(), logo));

    [RequirePermission(Permissions.HotelsManage)]
    [HttpPatch("{id:int}")]
    public async Task<HotelDto> Update(int id, UpdateHotelRequest input)
    {
        var canPublish = await permissionService.IsGrantedAsync(User.GetRole(), Permissions.HotelsPublish);
        return await hotelService.UpdateAsync(id, input, canPublish);
    }

    [RequirePermission(Permissions.HotelsManage)]
    [HttpPost("{id:int}/logo")]
    public async Task<ActionResult<HotelDto>> ReplaceLogo(int id, IFormFile? logo)
    {
        if (logo is null) throw ApiException.BadRequest("logo dosyası zorunlu");
        return await hotelService.ReplaceLogoAsync(id, User.GetUserId(), logo);
    }

    [RequirePermission(Permissions.HotelsManage)]
    [HttpDelete("{id:int}/logo")]
    public Task<HotelDto> RemoveLogo(int id) => hotelService.RemoveLogoAsync(id);

    [RequirePermission(Permissions.HotelsDelete)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        await hotelService.DeleteAsync(id);
        return NoContent();
    }
}
