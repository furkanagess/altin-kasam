import { Link, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/src/widgets/atoms/AppText';
import { colors } from '@/src/core/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Bulunamadı' }} />
      <View style={styles.container}>
        <AppText variant="h2">Bu ekran yok</AppText>
        <Link href="/" style={styles.link}>
          <AppText tone="gold">Piyasaya dön</AppText>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: colors.surface.canvas,
    gap: 12,
  },
  link: {
    marginTop: 8,
  },
});
