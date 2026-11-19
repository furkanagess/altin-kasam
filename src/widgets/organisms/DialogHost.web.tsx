import { resolveDialog, subscribeDialogs, type AppDialog } from '@/src/core/dialog/appAlert';
import { makeStyles, paddings, radii, typography } from '@/src/core/theme';
import { AppText } from '@/src/widgets/atoms/AppText';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

/**
 * `appAlert` diyaloglarını web'de ortalanmış pencere olarak gösterir. Kuyruktaki ilk diyalog
 * görünür; `Esc` (Modal'ın `onRequestClose`'u) ve dış tıklama iptal düğmesi gibi davranır.
 */
export function DialogHost() {
  const [queue, setQueue] = useState<readonly AppDialog[]>([]);
  useEffect(() => subscribeDialogs(setQueue), []);
  const dialog = queue[0];
  if (!dialog) return null;
  return <Dialog key={dialog.id} dialog={dialog} />;
}

function Dialog({ dialog }: { dialog: AppDialog }) {
  const styles = useStyles();
  const cancel = dialog.buttons.find((b) => b.style === 'cancel');
  const dismiss = () => resolveDialog(dialog.id, cancel);
  // İptal solda, asıl işlem sağda (masaüstü alışkanlığı); sıra korunur, yalnızca iptal öne alınır.
  const ordered = cancel ? [cancel, ...dialog.buttons.filter((b) => b !== cancel)] : dialog.buttons;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={dismiss} accessibilityLabel="Kapat" />
        <View style={styles.card} accessibilityRole="alert">
          <AppText variant="h3">{dialog.title}</AppText>
          {dialog.message ? (
            <AppText variant="body" tone="secondary">
              {dialog.message}
            </AppText>
          ) : null}
          <View style={styles.actions}>
            {ordered.map((button, i) => {
              const primary = i === ordered.length - 1 && button.style !== 'cancel';
              return (
                <Pressable
                  key={`${button.text}-${i}`}
                  onPress={() => resolveDialog(dialog.id, button)}
                  accessibilityRole="button"
                  style={[
                    styles.button,
                    button.style === 'destructive' ? styles.destructive : primary ? styles.primary : styles.secondary,
                  ]}
                >
                  <AppText
                    style={[
                      styles.label,
                      button.style === 'destructive' ? styles.destructiveText : primary ? styles.primaryText : null,
                    ]}
                  >
                    {button.text ?? 'Tamam'}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: paddings.screen },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.surface.overlay },
  card: {
    width: '100%',
    maxWidth: 440,
    gap: paddings.sm,
    padding: paddings.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.surface.elevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.subtle,
    boxShadow: '0 20px 48px rgba(0, 0, 0, 0.28)',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: paddings.xs,
    marginTop: paddings.xs,
  },
  button: {
    minHeight: 40,
    paddingHorizontal: paddings.lg,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: { backgroundColor: colors.surface.muted },
  primary: { backgroundColor: colors.brand.gold },
  destructive: { backgroundColor: colors.semantic.down },
  label: { ...typography.bodyStrong, color: colors.text.primary },
  primaryText: { color: colors.text.onGold },
  destructiveText: { color: '#FFFFFF' },
}));
