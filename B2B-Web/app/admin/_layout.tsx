import { Pressable, View } from "react-native";
import { Link, Redirect, Slot, usePathname } from "expo-router";
import { Footer } from "../../src/components/ui/Footer";
import { GlassBackground } from "../../src/components/ui/GlassBackground";
import { LanguageSwitcher } from "../../src/components/ui/LanguageSwitcher";
import { Muted } from "../../src/components/ui/Typography";
import { useAuth } from "../../src/features/auth/AuthContext";
import { useLanguage } from "../../src/i18n/LanguageContext";
import { PERMISSIONS } from "../../src/features/rolePermissions/hooks";

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href as never} className={`px-3 py-2.5 rounded-md lg:w-full ${active ? "bg-ink-900/8" : ""}`}>
      <Muted className={active ? "text-ink-900 font-medium" : "text-ink-400"}>{label}</Muted>
    </Link>
  );
}

export default function AdminLayout() {
  const { user, isLoading, logout } = useAuth();
  const { t } = useLanguage();
  const pathname = usePathname();

  if (isLoading) return null;
  if (!user) return <Redirect href="/login" />;

  const navLinks = (
    <>
      {user.permissions.includes(PERMISSIONS.HotelsManage) ? (
        <NavLink href="/admin" label={t("admin.nav.hotels")} active={pathname === "/admin"} />
      ) : null}
      {user.permissions.includes(PERMISSIONS.UsersManage) ? (
        <NavLink
          href="/admin/users"
          label={t("admin.nav.users")}
          active={pathname.startsWith("/admin/users")}
        />
      ) : null}
      {user.permissions.includes(PERMISSIONS.EmailSettingsManage) ? (
        <NavLink
          href="/admin/email-settings"
          label={t("admin.nav.emailSettings")}
          active={pathname.startsWith("/admin/email-settings")}
        />
      ) : null}
      {user.permissions.includes(PERMISSIONS.AuditLogsView) ? (
        <NavLink
          href="/admin/audit-logs"
          label={t("admin.nav.auditLogs")}
          active={pathname.startsWith("/admin/audit-logs")}
        />
      ) : null}
      {user.role === "admin" ? (
        <NavLink
          href="/admin/role-permissions"
          label={t("admin.nav.rolePermissions")}
          active={pathname.startsWith("/admin/role-permissions")}
        />
      ) : null}
    </>
  );

  return (
    <GlassBackground>
      <View className="flex-1">
        <View className="flex-1 lg:flex-row">
          {/* Wide screens: vertical nav sidebar, user info + logout pinned to its bottom */}
          <View className="hidden lg:flex lg:w-48 lg:border-r lg:border-ink-900/10 px-3 py-6">
            <View className="flex-1 gap-1">{navLinks}</View>
            <View className="gap-3 pt-4 border-t border-ink-900/10 px-3">
              <LanguageSwitcher />
              <Muted numberOfLines={1}>{user.displayName}</Muted>
              <Pressable onPress={logout}>
                <Muted className="text-red-600">{t("admin.nav.logout")}</Muted>
              </Pressable>
            </View>
          </View>

          {/* Narrow screens: original horizontal top bar */}
          <View className="flex lg:hidden flex-row items-center justify-between px-6 py-4 border-b border-ink-900/10">
            <View className="flex-row items-center gap-1 flex-wrap">{navLinks}</View>
            <View className="flex-row items-center gap-4">
              <LanguageSwitcher />
              <Muted>{user.displayName}</Muted>
              <Pressable onPress={logout}>
                <Muted className="text-red-600">{t("admin.nav.logout")}</Muted>
              </Pressable>
            </View>
          </View>

          <View className="flex-1 px-6 py-6">
            <Slot />
          </View>
        </View>
        <Footer />
      </View>
    </GlassBackground>
  );
}
