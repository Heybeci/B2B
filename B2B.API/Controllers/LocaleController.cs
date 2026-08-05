using Microsoft.AspNetCore.Mvc;
using B2B.API.Dtos;
using B2B.API.Services;

namespace B2B.API.Controllers;

// Public (no auth, no permission) — same visibility tier as GET /api/hotels.
[ApiController]
[Route("api/locale")]
public class LocaleController(LocaleSuggestionService localeSuggestionService) : ControllerBase
{
    [HttpGet("suggest")]
    public async Task<ActionResult<LocaleSuggestionDto>> Suggest() =>
        Ok(await localeSuggestionService.SuggestAsync(HttpContext.Connection.RemoteIpAddress, HttpContext.RequestAborted));
}
