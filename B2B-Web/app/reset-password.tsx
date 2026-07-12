import { useState } from "react";
import { View } from "react-native";
import { Link, router, useLocalSearchParams } from "expo-router";
import { Button } from "../src/components/ui/Button";
import { Card } from "../src/components/ui/Card";
import { GlassBackground } from "../src/components/ui/GlassBackground";
import { Input } from "../src/components/ui/Input";
import { Body, Heading, Muted } from "../src/components/ui/Typography";
import { useResetPassword } from "../src/features/auth/hooks";
import { useLanguage } from "../src/i18n/LanguageContext";

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const resetPassword = useResetPassword();
  const { t } = useLanguage();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (newPassword.length < 8) {
      setError(t("resetPassword.tooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("resetPassword.mismatch"));
      return;
    }
    try {
      await resetPassword.mutateAsync({ token: token!, newPassword });
      setDone(true);
    } catch {
      setError(t("resetPassword.invalidOrExpired"));
    }
  };

  return (
    <GlassBackground style={{ alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
      <Card className="w-full max-w-md p-8 gap-5">
        <Heading>{t("resetPassword.title")}</Heading>
        {!token ? (
          <Body>{t("resetPassword.invalidLink")}</Body>
        ) : done ? (
          <>
            <Body>{t("resetPassword.success")}</Body>
            <Button label={t("login.submit")} onPress={() => router.replace("/login")} />
          </>
        ) : (
          <>
            <Input label={t("resetPassword.newPassword")} value={newPassword} onChangeText={setNewPassword} secureTextEntry />
            <Input
              label={t("resetPassword.confirmPassword")}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            {error ? <Muted className="text-red-600">{error}</Muted> : null}
            <Button label={t("resetPassword.submit")} onPress={onSubmit} loading={resetPassword.isPending} />
          </>
        )}
        <View className="items-center">
          <Link href="/login">
            <Muted>{t("forgotPassword.backToLogin")}</Muted>
          </Link>
        </View>
      </Card>
    </GlassBackground>
  );
}
