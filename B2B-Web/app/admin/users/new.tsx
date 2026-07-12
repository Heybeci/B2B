import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Button } from "../../../src/components/ui/Button";
import { Input } from "../../../src/components/ui/Input";
import { Heading, Muted } from "../../../src/components/ui/Typography";
import { useAuth } from "../../../src/features/auth/AuthContext";
import { useCreateUser, type UserRole } from "../../../src/features/users/hooks";
import { useLanguage } from "../../../src/i18n/LanguageContext";

export default function NewUserScreen() {
  const { user: currentUser } = useAuth();
  const createUser = useCreateUser();
  const { t } = useLanguage();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("staff");
  const [error, setError] = useState<string | null>(null);

  // Yönetici (manager) kimseyi Sistem Yöneticisi yapamaz — bu rol sadece
  // Sistem Yöneticisi'nin kendi oluşturduğu formda seçenek olarak görünür.
  const assignableRoles: UserRole[] =
    currentUser?.role === "admin" ? ["staff", "manager", "admin"] : ["staff", "manager"];

  const onSubmit = async () => {
    setError(null);
    try {
      await createUser.mutateAsync({ username, email, displayName, password, role });
      router.replace("/admin/users");
    } catch {
      setError(t("users.createFailed"));
    }
  };

  return (
    <ScrollView className="flex-1" contentContainerClassName="max-w-md gap-5">
      <Heading>{t("users.newUserTitle")}</Heading>
      <Input label={t("users.displayName")} value={displayName} onChangeText={setDisplayName} />
      <Input label={t("common.username")} value={username} onChangeText={setUsername} autoCapitalize="none" />
      <Input
        label={t("common.email")}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Input label={t("common.password")} value={password} onChangeText={setPassword} secureTextEntry />

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
      <Button label={t("common.create")} onPress={onSubmit} loading={createUser.isPending} />
    </ScrollView>
  );
}
