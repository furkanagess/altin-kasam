import { COMMUNITY_KIND_LABELS } from "@/src/core/constants/community";
import { makeStyles, paddings, radii } from "@/src/core/theme";
import type { CommunityPost } from "@/src/domain/models";
import { formatRelativeTr } from "@/src/utils/format";
import { AppText } from "@/src/widgets/atoms/AppText";
import { Badge } from "@/src/widgets/atoms/Badge";
import { Pressable, View } from "react-native";

type Props = {
  post: CommunityPost;
  onPress?: () => void;
  /** Takip edilen kaynaktan; kartta işaretlenir. */
  followed?: boolean;
  /** Detayı açılmış; soluk gösterilir ve "Okundu" işareti alır. */
  read?: boolean;
};

export function PostCard({ post, onPress, followed, read }: Props) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        followed && !read && styles.followed,
        read && styles.read,
      ]}
      accessibilityRole="button"
      accessibilityHint={read ? "Okundu" : undefined}
    >
      <View style={styles.meta}>
        <View style={styles.badges}>
          <Badge label={COMMUNITY_KIND_LABELS[post.kind]} tone="gold" />
          {followed ? <Badge label="Takip" tone="up" /> : null}
        </View>
        <AppText variant="caption" tone="tertiary">
          {read ? "✓ Okundu · " : ""}
          {formatRelativeTr(post.publishedAt)}
        </AppText>
      </View>
      {post.title ? (
        <AppText variant="h3" tone={read ? "secondary" : undefined}>
          {post.title}
        </AppText>
      ) : null}
      {post.body ? (
        <AppText variant="body" tone="secondary" numberOfLines={3}>
          {post.body}
        </AppText>
      ) : null}
      <View style={styles.footer}>
        <AppText variant="caption" tone="secondary">
          {post.author === post.source
            ? post.author
            : `${post.author} · ${post.source}`}
          {post.likes ? ` · ♥ ${post.likes}` : ""}
        </AppText>
        {post.hashtags.length ? (
          <AppText variant="caption" tone="tertiary" numberOfLines={1}>
            {post.hashtags.slice(0, 3).join(" ")}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    gap: 8,
    padding: paddings.card,
    borderRadius: radii.lg,
    backgroundColor: colors.surface.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  meta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badges: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  followed: { borderColor: colors.brand.goldSoft },
  read: { backgroundColor: colors.surface.canvas, opacity: 0.8 },
  footer: {
    gap: 4,
    marginTop: 4,
  },
}));
