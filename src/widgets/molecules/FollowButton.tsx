import { makeStyles, paddings, radii } from '@/src/core/theme';
import { useCommunityViewModel } from '@/src/viewmodels/community/CommunityProvider';
import { AppText } from '@/src/widgets/atoms/AppText';
import React, { useState } from 'react';
import { Pressable } from 'react-native';

/** Haber kaynağını takip et / bırak; takip edilirken dolu, değilken çerçeveli. */
export function FollowButton({ source }: { source: string }) {
  const styles = useStyles();
  const { followedSources, toggleFollow } = useCommunityViewModel();
  const [busy, setBusy] = useState(false);
  const following = followedSources.has(source);

  return (
    <Pressable
      onPress={async () => {
        if (busy) return;
        setBusy(true);
        try {
          await toggleFollow(source);
        } finally {
          setBusy(false);
        }
      }}
      style={[styles.button, following ? styles.following : styles.idle, busy && styles.busy]}
      accessibilityRole="button"
      accessibilityLabel={following ? `${source} takibini bırak` : `${source} kaynağını takip et`}
      aria-pressed={following}
      hitSlop={6}
    >
      <AppText variant="caption" style={following ? styles.followingText : styles.idleText}>
        {following ? '✓ Takip ediliyor' : '+ Takip et'}
      </AppText>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  button: {
    paddingHorizontal: paddings.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  idle: { borderColor: colors.brand.gold, backgroundColor: colors.surface.elevated },
  following: { borderColor: colors.brand.gold, backgroundColor: colors.brand.gold },
  busy: { opacity: 0.6 },
  idleText: { color: colors.brand.goldDeep, fontWeight: '700' },
  followingText: { color: colors.text.onGold, fontWeight: '700' },
}));
