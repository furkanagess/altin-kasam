import { Link, Stack } from 'expo-router';
import { View } from 'react-native';
import { AppText } from '@/src/widgets/atoms/AppText';
import { makeStyles } from '@/src/core/theme';

export default function NotFoundScreen() {
  const styles = useStyles();
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

const useStyles = makeStyles((colors) => ({
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
}));
