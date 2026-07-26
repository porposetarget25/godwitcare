// app/_layout.tsx
import { Stack } from 'expo-router';
import { StatusBar, View, Animated, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/state/auth';
import { RegProvider } from '../src/state/registration';
import { colors } from '../src/theme';
import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SplashScreen from '../src/screens/SplashScreen';
import { useRouter } from 'expo-router';

export const PIN_KEY         = 'gc_pin';
export const PIN_ENABLED_KEY = 'gc_pin_enabled';

const SPLASH_DURATION   = 2800;
const FADE_OUT_DURATION =  500;

// Routes that handle their own navigation — don't redirect away from these
const SELF_MANAGED = [
  '/onboarding', '/otp-verification', '/forgot-password',
  '/reset-password', '/pin-lock',
];

function AppNavigator() {
  const router   = useRouter();
  const { user, loading } = useAuth();
  const [initialised, setInitialised] = useState(false);

  useEffect(() => {
    if (loading) return;
    // Only do the initial redirect once on app open
    if (initialised) return;
    setInitialised(true);
    (async () => {
      if (!user) {
        router.replace('/onboarding');
      } else {
        const pinEnabled = await AsyncStorage.getItem(PIN_ENABLED_KEY);
        if (pinEnabled === 'true') {
          router.replace('/pin-lock');
        } else {
          router.replace('/(app)/home');
        }
      }
    })();
  }, [loading]); // Only depend on loading, not user — prevents redirect during OTP flow

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const [splashVisible, setSplashVisible] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: FADE_OUT_DURATION,
        useNativeDriver: true,
      }).start(() => setSplashVisible(false));
    }, SPLASH_DURATION);
    return () => clearTimeout(t);
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar backgroundColor={colors.brand} barStyle="light-content" translucent={false} />
      <AuthProvider>
        <RegProvider>
          <AppNavigator />
        </RegProvider>
      </AuthProvider>
      {splashVisible && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]} pointerEvents="none">
          <SplashScreen />
        </Animated.View>
      )}
    </SafeAreaProvider>
  );
}
