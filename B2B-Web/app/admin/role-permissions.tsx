import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Button } from "../../src/components/ui/Button";
import { Card } from "../../src/components/ui/Card";
import { Body, Heading, Muted } from "../../src/components/ui/Typography";
import {
  ALL_PERMISSIONS,
  PERMISSION_LABEL_KEYS,
  useRolePermissions,
  useUpdateRolePermissions,
} from "../../src/features/rolePermissions/hooks";
import { useLanguage } from "../../src/i18n/LanguageContext";

function Toggle({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-3 py-1.5 rounded-md border ${checked ? "border-brass-400 bg-brass-400/15" : "border-ink-900/20"}`}
    >
      <Muted className={checked ? "text-brass-700 font-medium" : ""}>{label}</Muted>
    </Pressable>
  );
}

export default function RolePermissionsScreen() {
  const { data, isLoading } = useRolePermissions();
  const updatePermissions = useUpdateRolePermissions();
  const { t } = useLanguage();

  const [manager, setManager] = useState<Set<string>>(new Set());
  const [staff, setStaff] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!data) return;
    setManager(new Set(data.manager));
    setStaff(new Set(data.staff));
  }, [data]);

  const toggle = (role: "manager" | "staff", key: string) => {
    setSaved(false);
    const set = role === "manager" ? manager : staff;
    const setter = role === "manager" ? setManager : setStaff;
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setter(next);
  };

  const onSubmit = async () => {
    setSaved(false);
    await updatePermissions.mutateAsync({ manager: [...manager], staff: [...staff] });
    setSaved(true);
  };

  if (isLoading) {
    return <Muted>{t("common.loading")}</Muted>;
  }

  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-6">
      <Heading>{t("admin.nav.rolePermissions")}</Heading>
      <Muted>{t("rolePermissions.description")}</Muted>

      <View className="gap-3 max-w-2xl">
        {ALL_PERMISSIONS.map((key) => (
          <Card key={key} className="p-4 flex-row items-center justify-between">
            <Body className="text-ink-900 flex-1 pr-4">{t(PERMISSION_LABEL_KEYS[key])}</Body>
            <View className="flex-row gap-2">
              <Toggle label={t("roles.manager")} checked={manager.has(key)} onPress={() => toggle("manager", key)} />
              <Toggle label={t("roles.staff")} checked={staff.has(key)} onPress={() => toggle("staff", key)} />
            </View>
          </Card>
        ))}
      </View>

      {saved ? <Muted className="text-brass-700">{t("common.saved")}</Muted> : null}
      <Button label={t("common.save")} onPress={onSubmit} loading={updatePermissions.isPending} />
    </ScrollView>
  );
}
