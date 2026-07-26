// app/(app)/_layout.tsx
import { Stack } from 'expo-router';
import { View, StatusBar, Platform } from 'react-native';
import { BottomNav } from '../../src/components/BottomNav';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../src/theme';

export default function AppLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.brand }}>
      {/* Explicitly fill the status bar area with brand color */}
      <View style={{ height: insets.top, backgroundColor: colors.brand }} />
      <StatusBar
        backgroundColor={colors.brand}
        barStyle="light-content"
        translucent={false}
      />
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
      <BottomNav />
    </View>
  );
}
