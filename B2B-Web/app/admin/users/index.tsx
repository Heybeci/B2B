import { Pressable, ScrollView, View } from "react-native";
import { Link } from "expo-router";
import { Button } from "../../../src/components/ui/Button";
import { Card } from "../../../src/components/ui/Card";
import { Body, Heading, Muted } from "../../../src/components/ui/Typography";
import { useToggleUserActive, useUsers } from "../../../src/features/users/hooks";
import { useLanguage } from "../../../src/i18n/LanguageContext";

export default function AdminUsersScreen() {
  const { data: users, isLoading } = useUsers();
  const toggleActive = useToggleUserActive();
  const { t } = useLanguage();

  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-6">
      <View className="flex-row items-center justify-between">
        <Heading>{t("admin.nav.users")}</Heading>
        <Link href="/admin/users/new" asChild>
          <Button label={t("users.newUser")} />
        </Link>
      </View>

      {isLoading ? (
        <Muted>{t("common.loading")}</Muted>
      ) : (
        <View className="gap-3 max-w-xl">
          {users?.map((user) => (
            <Card key={user.id} className="p-4 flex-row items-center justify-between">
              <Link href={{ pathname: "/admin/users/[userId]", params: { userId: String(user.id) } }} asChild>
                <Pressable>
                  <Body className="text-ink-900 font-medium">{user.displayName}</Body>
                  <Muted>
                    @{user.username} · {t(`roles.${user.role}`)}
                  </Muted>
                </Pressable>
              </Link>
              <View className="flex-row items-center gap-4">
                <Link href={{ pathname: "/admin/users/[userId]", params: { userId: String(user.id) } }}>
                  <Muted className="text-brass-700">{t("common.edit")}</Muted>
                </Link>
                <Pressable onPress={() => toggleActive.mutate({ id: user.id, isActive: !user.isActive })}>
                  <Muted className={user.isActive ? "text-red-600" : "text-brass-700"}>
                    {user.isActive ? t("users.deactivate") : t("users.activate")}
                  </Muted>
                </Pressable>
              </View>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
