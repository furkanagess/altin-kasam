import { PUBLISHER_FEEDS } from '@/src/core/constants/community';
import { DATA_SOURCE_GROUPS, FRED_NOTICE, type DataSource } from '@/src/core/constants/dataSources';
import { makeStyles, paddings } from '@/src/core/theme';
import { AppText } from '@/src/widgets/atoms/AppText';
import { Screen } from '@/src/widgets/atoms/Screen';
import React from 'react';
import { View } from 'react-native';

const NEWS_USAGE = 'Altın ve gümüş haber başlıkları ve bağlantıları';

/** Gruplar tek yerden: sabit liste + haber yayıncıları (her biri ayrı satır). */
const GROUPS: { title: string; sources: DataSource[] }[] = [
  ...DATA_SOURCE_GROUPS,
  { title: 'Haberler', sources: PUBLISHER_FEEDS.map((feed) => ({ name: feed.name, usage: NEWS_USAGE })) },
];

function SourceRow({ source }: { source: DataSource }) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <AppText variant="bodyStrong">{source.name}</AppText>
      <AppText variant="caption" tone="secondary">
        {source.usage}
      </AppText>
    </View>
  );
}

/** Ayarlar > Veri kaynakları: uygulamada kullanılan tüm dış kaynaklar tek tek. */
export default function DataSourcesScreen() {
  const styles = useStyles();
  return (
    <Screen scroll>
      <AppText variant="body" tone="secondary">
        Uygulamadaki fiyat, takvim ve haber verileri aşağıdaki kaynaklardan derlenir.
      </AppText>
      {GROUPS.map((group) => (
        <View key={group.title} style={styles.group}>
          <AppText variant="caption" tone="tertiary" style={styles.groupTitle}>
            {group.title.toLocaleUpperCase('tr-TR')}
          </AppText>
          <View style={styles.list}>
            {group.sources.map((source, i) => (
              <React.Fragment key={source.name}>
                {i ? <View style={styles.divider} /> : null}
                <SourceRow source={source} />
              </React.Fragment>
            ))}
          </View>
        </View>
      ))}
      <AppText variant="caption" tone="tertiary">
        {FRED_NOTICE}
      </AppText>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  group: { gap: paddings.xs },
  groupTitle: { letterSpacing: 0.6 },
  list: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.subtle,
  },
  row: { gap: 2, paddingVertical: paddings.sm },
  divider: { height: 1, backgroundColor: colors.border.subtle },
}));
