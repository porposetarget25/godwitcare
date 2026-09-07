// app/(app)/_layout.tsx
import { Stack } from 'expo-router';
import { View, StatusBar } from 'react-native';
import { PortalShell } from '../../src/components/PortalShell';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { wc } from '../../src/webStyle';

export default function AppLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: wc.surface2 }}>
      {/* Explicitly fill the status bar area */}
      <View style={{ height: insets.top, backgroundColor: wc.surface2 }} />
      <StatusBar
        backgroundColor={wc.surface2}
        barStyle="dark-content"
        translucent={false}
      />
      <PortalShell>
        <Stack screenOptions={{ headerShown: false }} />
      </PortalShell>
    </View>
  );
}
