import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { StyleProp, ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/** One name per concept → SF Symbol on iOS, Material Symbol on Android and web. */
export const ICONS = {
  home: { ios: 'house.fill', android: 'home', web: 'home' },
  explore: { ios: 'sparkles.rectangle.stack.fill', android: 'explore', web: 'explore' },
  library: { ios: 'play.rectangle.on.rectangle.fill', android: 'video_library', web: 'video_library' },
  profile: { ios: 'person.crop.circle.fill', android: 'account_circle', web: 'account_circle' },
  create: { ios: 'plus', android: 'add', web: 'add' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  credits: { ios: 'bolt.fill', android: 'bolt', web: 'bolt' },
  download: { ios: 'arrow.down.to.line', android: 'download', web: 'download' },
  share: { ios: 'square.and.arrow.up', android: 'share', web: 'share' },
  trash: { ios: 'trash', android: 'delete', web: 'delete' },
  play: { ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  checkCircle: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  person: { ios: 'person.fill', android: 'person', web: 'person' },
  product: { ios: 'shippingbox.fill', android: 'inventory_2', web: 'inventory_2' },
  photo: { ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' },
  remix: { ios: 'wand.and.stars', android: 'auto_fix_high', web: 'auto_fix_high' },
  warning: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
  clock: { ios: 'clock.fill', android: 'schedule', web: 'schedule' },
  restore: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
  crown: { ios: 'crown.fill', android: 'workspace_premium', web: 'workspace_premium' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' },
  edit: { ios: 'pencil', android: 'edit', web: 'edit' },
} satisfies Record<string, Extract<SymbolViewProps['name'], object>>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 20,
  color,
  style,
}: {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return <SymbolView name={ICONS[name]} size={size} tintColor={color ?? t.text} style={style} />;
}
