import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Button } from "../../src/components/ui/Button";
import { Input } from "../../src/components/ui/Input";
import { Heading, Muted } from "../../src/components/ui/Typography";
import { useEmailSettings, useUpdateEmailSettings } from "../../src/features/settings/hooks";
import { useLanguage } from "../../src/i18n/LanguageContext";

export default function EmailSettingsScreen() {
  const { data: settings, isLoading } = useEmailSettings();
  const updateSettings = useUpdateEmailSettings();
  const { t } = useLanguage();

  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [fromName, setFromName] = useState("");
  const [enableSsl, setEnableSsl] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setSmtpHost(settings.smtpHost);
    setSmtpPort(String(settings.smtpPort));
    setSmtpUsername(settings.smtpUsername);
    setFromAddress(settings.fromAddress);
    setFromName(settings.fromName);
    setEnableSsl(settings.enableSsl);
  }, [settings]);

  const onSubmit = async () => {
    setError(null);
    setSaved(false);
    const port = Number(smtpPort);
    if (!Number.isInteger(port) || port <= 0) {
      setError(t("email.portInvalid"));
      return;
    }
    try {
      await updateSettings.mutateAsync({
        smtpHost,
        smtpPort: port,
        smtpUsername,
        smtpPassword: smtpPassword || undefined,
        fromAddress,
        fromName,
        enableSsl,
      });
      setSmtpPassword("");
      setSaved(true);
    } catch {
      setError(t("email.saveFailed"));
    }
  };

  if (isLoading) {
    return <Muted>{t("common.loading")}</Muted>;
  }

  return (
    <ScrollView className="flex-1" contentContainerClassName="max-w-md gap-5">
      <Heading>{t("admin.nav.emailSettings")}</Heading>
      <Muted>{t("email.description")}</Muted>

      <Input label={t("email.smtpHost")} value={smtpHost} onChangeText={setSmtpHost} autoCapitalize="none" />
      <Input label={t("email.smtpPort")} value={smtpPort} onChangeText={setSmtpPort} keyboardType="number-pad" />
      <Input
        label={t("email.smtpUsername")}
        value={smtpUsername}
        onChangeText={setSmtpUsername}
        autoCapitalize="none"
      />
      <Input
        label={t("email.smtpPassword")}
        value={smtpPassword}
        onChangeText={setSmtpPassword}
        secureTextEntry
        placeholder={settings?.hasPassword ? t("email.passwordPlaceholder") : ""}
      />
      <Input
        label={t("email.fromAddress")}
        value={fromAddress}
        onChangeText={setFromAddress}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Input label={t("email.fromName")} value={fromName} onChangeText={setFromName} />

      <View className="gap-2">
        <Muted>{t("email.useSsl")}</Muted>
        <View className="flex-row gap-3">
          {[true, false].map((value) => (
            <Pressable
              key={String(value)}
              onPress={() => setEnableSsl(value)}
              className={`px-4 py-2 rounded-md border ${
                enableSsl === value ? "border-brass-400 bg-brass-400/15" : "border-ink-900/20"
              }`}
            >
              <Muted className={enableSsl === value ? "text-brass-700 font-medium" : ""}>
                {value ? t("common.yes") : t("common.no")}
              </Muted>
            </Pressable>
          ))}
        </View>
      </View>

      {error ? <Muted className="text-red-600">{error}</Muted> : null}
      {saved ? <Muted className="text-brass-700">{t("common.saved")}</Muted> : null}
      <Button label={t("common.save")} onPress={onSubmit} loading={updateSettings.isPending} />
    </ScrollView>
  );
}
