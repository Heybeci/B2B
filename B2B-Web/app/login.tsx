import { useRef, useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import { Link, router } from "expo-router";
import { Button } from "../src/components/ui/Button";
import { Footer } from "../src/components/ui/Footer";
import { GlassBackground } from "../src/components/ui/GlassBackground";
import { Input } from "../src/components/ui/Input";
import { LanguageSwitcher } from "../src/components/ui/LanguageSwitcher";
import { Muted } from "../src/components/ui/Typography";
import { useAuth } from "../src/features/auth/AuthContext";
import { useLanguage } from "../src/i18n/LanguageContext";
import { BADGE_SHADOW, CARD_SHADOW } from "../src/theme/glass";

export default function LoginScreen() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      router.replace("/admin");
    } catch {
      setError(t("login.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassBackground style={{ alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
      <View style={{ position: "absolute", top: 16, right: 20 }}>
        <LanguageSwitcher />
      </View>

      <Text
        className="absolute text-ink-900/5 text-8xl font-extrabold tracking-widest"
        numberOfLines={1}
      >
        Stone Group - Media Portal
      </Text>

      {/* Kart ölçüleri sg-portal'daki .login-card ile aynı (52/44/44 padding,
          420 max width, 20px radius) — renkler stonegroup.com.tr'nin "sand"
          temasına göre (koyu değil, açık/paper zemin + koyu metin). */}
      <View
        style={[
          {
            width: "100%",
            maxWidth: 420,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: "rgba(24,21,15,0.1)",
            backgroundColor: "rgba(250,248,244,0.9)",
            paddingTop: 52,
            paddingHorizontal: 44,
            paddingBottom: 44,
          },
          CARD_SHADOW,
        ]}
      >
        <View style={{ alignItems: "center", marginBottom: 36 }}>
          <View
            style={[
              {
                width: 80,
                height: 80,
                borderRadius: 18,
                backgroundColor: "#18150F", // ink-900
                overflow: "hidden",
                marginBottom: 16,
              },
              BADGE_SHADOW,
            ]}
          >
            <Image
              source={require("../assets/login-logo.jpg")}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
              fadeDuration={0}
            />
          </View>
          <Text className="text-ink-900" style={{ fontSize: 22, fontWeight: "700", letterSpacing: -0.3 }}>
            Stone Group - Media Portal
          </Text>
          <Text className="text-ink-500" style={{ fontSize: 13, letterSpacing: 0.3, marginTop: 5 }}>
            {t("login.subtitle")}
          </Text>
        </View>

        <View style={{ gap: 18 }}>
          <Input
            label={t("common.username")}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t("login.usernamePlaceholder")}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            editable={!loading}
          />
          <Input
            ref={passwordRef}
            label={t("common.password")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder={t("login.passwordPlaceholder")}
            returnKeyType="done"
            onSubmitEditing={onSubmit}
            editable={!loading}
          />

          <Pressable
            onPress={() => setRememberMe((r) => !r)}
            style={{ flexDirection: "row", alignItems: "center", gap: 9 }}
          >
            <View
              className={rememberMe ? "border-brass-400 bg-brass-400" : "border-ink-300 bg-transparent"}
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                borderWidth: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {rememberMe ? <Text className="text-white" style={{ fontSize: 11, fontWeight: "700" }}>✓</Text> : null}
            </View>
            <Text className="text-ink-500" style={{ fontSize: 13 }}>{t("login.rememberMe")}</Text>
          </Pressable>

          {error ? <Muted className="text-red-600">{error}</Muted> : null}

          <View style={{ height: 1, backgroundColor: "rgba(24,21,15,0.08)" }} />

          <Button label={t("login.submit")} onPress={onSubmit} loading={loading} fullWidth />

          <Link href="/forgot-password" style={{ alignSelf: "center" }}>
            <Muted>{t("login.forgotPassword")}</Muted>
          </Link>
        </View>
      </View>

      <View className="absolute bottom-0 left-0 right-0">
        <Footer />
      </View>
    </GlassBackground>
  );
}
