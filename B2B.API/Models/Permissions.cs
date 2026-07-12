namespace B2B.API.Models;

// Configurable permission keys for the "Yönetici"/"Kullanıcı" roles. Sistem
// Yöneticisi (Admin) always has every permission, implicitly and not
// configurable — see PermissionService.
public static class Permissions
{
    public const string HotelsManage = "hotels.manage";
    public const string HotelsDelete = "hotels.delete";
    public const string HotelsPublish = "hotels.publish";
    public const string UsersManage = "users.manage";
    public const string EmailSettingsManage = "email_settings.manage";
    public const string AuditLogsView = "audit_logs.view";

    public static readonly string[] All =
    [
        HotelsManage,
        HotelsDelete,
        HotelsPublish,
        UsersManage,
        EmailSettingsManage,
        AuditLogsView,
    ];
}
