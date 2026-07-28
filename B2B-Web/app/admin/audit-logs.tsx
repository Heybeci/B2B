import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Button } from "../../src/components/ui/Button";
import { Card } from "../../src/components/ui/Card";
import { Heading, Muted } from "../../src/components/ui/Typography";
import { Tooltip } from "../../src/components/ui/Tooltip";
import { useAuditLogs } from "../../src/features/auditLogs/hooks";
import { useLanguage } from "../../src/i18n/LanguageContext";
import type { Locale } from "../../src/i18n/translations";

const DATE_LOCALE_TAGS: Record<Locale, string> = {
  tr: "tr-TR",
  en: "en-US",
  de: "de-DE",
  ru: "ru-RU",
};

function truncateText(text: string | undefined, maxLength: number = 15): string {
  if (!text) return "";
  return text.length > maxLength ? `${text.substring(0, maxLength)}…` : text;
}

export default function AuditLogsScreen() {
  const [page, setPage] = useState(1);
  const { data: logs, isLoading } = useAuditLogs(page);
  const { t, locale } = useLanguage();

  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-6">
      <Heading>{t("admin.nav.auditLogs")}</Heading>

      {isLoading ? (
        <Muted>{t("common.loading")}</Muted>
      ) : (
        <View className="gap-3 max-w-2xl">
          {logs?.length === 0 ? <Muted>{t("auditLogs.noRecords")}</Muted> : null}
          {logs?.map((log) => (
            <Card key={log.id} className="p-4 gap-1">
              <Muted className="text-ink-900 font-medium">
                {log.displayName} (@{log.username}) · {t(`roles.${log.role}`)}
              </Muted>
              <Muted>
                {log.action}
                {log.entityType ? ` · ${log.entityType}${log.entityId ? ` #${log.entityId}` : ""}` : ""} ·{" "}
                {log.statusCode}
              </Muted>
              {log.details ? <Muted className="text-ink-400">{log.details}</Muted> : null}
              <Muted className="text-ink-400">
                {new Date(log.createdAt).toLocaleString(DATE_LOCALE_TAGS[locale])}
              </Muted>
              {log.ipAddress && (
                <Tooltip label={log.ipAddress}>
                  <Muted className="text-ink-400">
                    {t("auditLogs.columnIpAddress")}: {truncateText(log.ipAddress)}
                  </Muted>
                </Tooltip>
              )}
              {log.userAgent && (
                <Tooltip label={log.userAgent}>
                  <Muted className="text-ink-400">
                    {t("auditLogs.columnUserAgent")}: {truncateText(log.userAgent)}
                  </Muted>
                </Tooltip>
              )}
            </Card>
          ))}
        </View>
      )}

      <View className="flex-row gap-3">
        <Button
          label={t("auditLogs.previous")}
          variant="secondary"
          onPress={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        />
        <Button
          label={t("auditLogs.next")}
          variant="secondary"
          onPress={() => setPage((p) => p + 1)}
          disabled={(logs?.length ?? 0) === 0}
        />
      </View>
    </ScrollView>
  );
}
