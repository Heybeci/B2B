import "../src/theme/global.css";
import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Slot } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { PlayfairDisplay_600SemiBold } from "@expo-google-fonts/playfair-display";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider } from "../src/features/auth/AuthContext";
import { LanguageProvider } from "../src/i18n/LanguageContext";
import { queryClient } from "../src/lib/api/queryClient";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter: Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    PlayfairDisplay: PlayfairDisplay_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <StatusBar style="dark" />
            <Slot />
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
