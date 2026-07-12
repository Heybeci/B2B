import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "../../../src/components/ui/Button";
import { Input } from "../../../src/components/ui/Input";
import { Heading, Muted } from "../../../src/components/ui/Typography";
import { useAuth } from "../../../src/features/auth/AuthContext";
import { useUpdateUser, useUsers, type UserRole } from "../../../src/features/users/hooks";
import { useLanguage } from "../../../src/i18n/LanguageContext";

export default function EditUserScreen() {
  const { userId: userIdParam } = useLocalSearchParams<{ userId: string }>();
  const userId = Number(userIdParam);

  const { user: currentUser } = useAuth();
  const { t } = useLanguage();
  const { data: users, isLoading } = useUsers();
  const user = users?.find((u) => u.id === userId);
  const updateUser = useUpdateUser(userId);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("staff");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName);
    setEmail(user.email);
    setRole(user.role);
  }, [user]);

  // Yönetici (manager) kimseyi Sistem Yöneticisi yapamaz — bu rol sadece
  // Sistem Yöneticisi'nin kendi düzenlediği formda seçenek olarak görünür.
  const assignableRoles: UserRole[] =
    currentUser?.role === "admin" ? ["staff", "manager", "admin"] : ["staff", "manager"];

  const onSubmit = async () => {
    setError(null);
    setSaved(false);
    try {
      await updateUser.mutateAsync({
        displayName,
        email,
        role,
        password: password || undefined,
      });
      setPassword("");
      setSaved(true);
    } catch {
      setError(t("users.updateFailed"));
    }
  };

  if (isLoading) return <Muted>{t("common.loading")}</Muted>;
  if (!user) return <Muted>{t("users.notFound")}</Muted>;

  return (
    <ScrollView className="flex-1" contentContainerClassName="max-w-md gap-5">
      <Heading>{t("users.editTitle")}</Heading>
      <Muted>@{user.username}</Muted>

      <Input label={t("users.displayName")} value={displayName} onChangeText={setDisplayName} />
      <Input
        label={t("common.email")}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Input
        label={t("users.newPassword")}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder={t("users.newPasswordPlaceholder")}
      />

      <View className="gap-2">
        <Muted>{t("common.role")}</Muted>
        <View className="flex-row gap-3">
          {assignableRoles.map((r) => (
            <Pressable
              key={r}
              onPress={() => setRole(r)}
              className={`px-4 py-2 rounded-md border ${role === r ? "border-brass-400 bg-brass-400/15" : "border-ink-900/20"}`}
            >
              <Muted className={role === r ? "text-brass-700 font-medium" : ""}>{t(`roles.${r}`)}</Muted>
            </Pressable>
          ))}
        </View>
      </View>

      {error ? <Muted className="text-red-600">{error}</Muted> : null}
      {saved ? <Muted className="text-brass-700">{t("common.saved")}</Muted> : null}
      <Button label={t("common.save")} onPress={onSubmit} loading={updateUser.isPending} />
      <Pressable onPress={() => router.back()}>
        <Muted className="text-center">{t("common.back")}</Muted>
      </Pressable>
    </ScrollView>
  );
}
