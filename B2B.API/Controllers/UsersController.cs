using Microsoft.AspNetCore.Mvc;
using B2B.API.Dtos;
using B2B.API.Models;
using B2B.API.Services;

namespace B2B.API.Controllers;

[ApiController]
[Route("api/users")]
[RequirePermission(Permissions.UsersManage)]
public class UsersController(UserService userService) : ControllerBase
{
    [HttpGet]
    public Task<List<UserDto>> List() => userService.ListAsync(User.GetRole());

    [HttpPost]
    public async Task<ActionResult<UserDto>> Create(CreateUserRequest input) =>
        StatusCode(201, await userService.CreateAsync(input, User.GetRole()));

    [HttpPatch("{id:int}")]
    public Task<UserDto> Update(int id, UpdateUserRequest input) => userService.UpdateAsync(id, input, User.GetRole());
}
