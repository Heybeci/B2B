import { useState } from "react";
import { View } from "react-native";
import { Link } from "expo-router";
import { Button } from "../src/components/ui/Button";
import { Card } from "../src/components/ui/Card";
import { GlassBackground } from "../src/components/ui/GlassBackground";
import { Input } from "../src/components/ui/Input";
import { Body, Heading, Muted } from "../src/components/ui/Typography";
import { useForgotPassword } from "../src/features/auth/hooks";
import { useLanguage } from "../src/i18n/LanguageContext";

export default function ForgotPasswordScreen() {
  const forgotPassword = useForgotPassword();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async () => {
    await forgotPassword.mutateAsync(email).catch(() => undefined);
    setSubmitted(true);
  };

  return (
    <GlassBackground style={{ alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
      <Card className="w-full max-w-md p-8 gap-5">
        <Heading>{t("forgotPassword.title")}</Heading>
        {submitted ? (
          <Body>{t("forgotPassword.submitted")}</Body>
        ) : (
          <>
            <Muted>{t("forgotPassword.instructions")}</Muted>
            <Input
              label={t("common.email")}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Button label={t("forgotPassword.submit")} onPress={onSubmit} loading={forgotPassword.isPending} />
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
