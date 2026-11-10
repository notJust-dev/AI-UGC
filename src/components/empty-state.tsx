import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Button } from './ui/button';
import { Icon, type IconName } from './ui/icon';
import { Text } from './ui/text';

export function EmptyState({
  icon,
  title,
  message,
  action,
  onAction,
}: {
  icon: IconName;
  title: string;
  message?: string;
  action?: string;
  onAction?: () => void;
}) {
  const t = useTheme();
  return (
    <View style={[styles.box, { backgroundColor: t.surface, borderColor: t.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: t.accentSoft }]}>
        <Icon name={icon} size={22} color={t.accent} />
      </View>
      <Text variant="headline" style={styles.center}>
        {title}
      </Text>
      {message ? (
        <Text variant="caption" tone="secondary" style={styles.center}>
          {message}
        </Text>
      ) : null}
      {action && onAction ? <Button title={action} onPress={onAction} style={styles.button} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.six,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  button: { marginTop: Spacing.two },
});
