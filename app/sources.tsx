import { makeStyles, paddings, radii } from '@/src/core/theme';
import { useCommunityViewModel } from '@/src/viewmodels/community/CommunityProvider';
import { AppText } from '@/src/widgets/atoms/AppText';
import { Screen } from '@/src/widgets/atoms/Screen';
import { EmptyState } from '@/src/widgets/molecules/EmptyState';
import { FollowButton } from '@/src/widgets/molecules/FollowButton';
import React from 'react';
import { StyleSheet, View } from 'react-native';

function SourceRow({ name, count }: { name: string; count: number }) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {name}
        </AppText>
        <AppText variant="caption" tone="tertiary">
          {count ? `Bugün ${count} haber` : 'Bugün henüz haber yok'}
        </AppText>
      </View>
      <FollowButton source={name} />
    </View>
  );
}

/** Haber kaynaklarını takip etme: takip edilenler önce, ardından bugün akışta haberi olanlar. */
export default function SourcesScreen() {
  const styles = useStyles();
  const { newsSources, followedSources } = useCommunityViewModel();
  const counts = new Map(newsSources.map((s) => [s.name, s.count]));
  const followed = [...followedSources].sort((a, b) => a.localeCompare(b, 'tr'));
  const others = newsSources.filter((s) => !followedSources.has(s.name));

  return (
    <Screen scroll>
      <AppText variant="body" tone="secondary">
        Takip ettiğin kaynakların haberleri Topluluk akışında en üstte görünür. Bu kaynaklardan yeni haber gelince
        bildirim alırsın; kontrol uygulama açıkken birkaç dakikada bir yapılır.
      </AppText>

      {followed.length ? (
        <>
          <AppText variant="caption" tone="tertiary" style={styles.sectionTitle}>
            {`TAKİP ETTİKLERİN · ${followed.length}`}
          </AppText>
          <View style={styles.card}>
            {followed.map((name, i) => (
              <React.Fragment key={name}>
                {i ? <View style={styles.divider} /> : null}
                <SourceRow name={name} count={counts.get(name) ?? 0} />
              </React.Fragment>
            ))}
          </View>
        </>
      ) : null}

      {others.length ? (
        <>
          <AppText variant="caption" tone="tertiary" style={styles.sectionTitle}>
            BUGÜN HABER YAYIMLAYAN KAYNAKLAR
          </AppText>
          <View style={styles.card}>
            {others.map((s, i) => (
              <React.Fragment key={s.name}>
                {i ? <View style={styles.divider} /> : null}
                <SourceRow name={s.name} count={s.count} />
              </React.Fragment>
            ))}
          </View>
        </>
      ) : !followed.length ? (
        <EmptyState
          title="Henüz kaynak yok"
          message="Bugünün haberleri yüklendiğinde kaynaklar burada listelenir."
        />
      ) : null}
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  sectionTitle: { letterSpacing: 0.6, marginBottom: -8 },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.elevated,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: paddings.sm,
    paddingHorizontal: paddings.card,
    paddingVertical: paddings.sm,
  },
  rowText: { flex: 1, gap: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border.subtle, marginLeft: paddings.card },
}));
