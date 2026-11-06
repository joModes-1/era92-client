import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import Icon from '../Icon';
import { colors } from '../../theme';

/**
 * The admin pages' icons, drawn as thin outlines like the "Lovable" canvas
 * (bell, menu, car, cash, gift, pin, clock…). Pages keep passing the app's
 * usual FontAwesome names; each one maps to its Ionicons outline twin here,
 * and any name without a twin falls back to the regular icon, so nothing
 * ever renders blank.
 */
const LINE: Record<string, string> = {
  bell: 'notifications-outline',
  bars: 'menu-outline',
  'chevron-right': 'chevron-forward',
  'chevron-left': 'chevron-back',
  'chevron-down': 'chevron-down',
  filter: 'options-outline',
  car: 'car-outline',
  coins: 'wallet-outline',
  'money-bill-wave': 'cash-outline',
  gift: 'gift-outline',
  store: 'storefront-outline',
  check: 'checkmark',
  'exclamation-triangle': 'warning-outline',
  phone: 'call-outline',
  'map-marker-alt': 'location-outline',
  user: 'person-outline',
  'user-plus': 'person-add-outline',
  clock: 'time-outline',
  tint: 'water-outline',
  gavel: 'hammer-outline',
  question: 'help-circle-outline',
  ban: 'ban-outline',
  undo: 'arrow-undo-outline',
  'exchange-alt': 'swap-horizontal-outline',
  trophy: 'trophy-outline',
  'balance-scale': 'scale-outline',
  'clipboard-list': 'clipboard-outline',
  'arrow-up': 'trending-up',
  'arrow-down': 'trending-down',
  moon: 'moon-outline',
  'info-circle': 'information-circle-outline',
  search: 'search-outline',
  'times-circle': 'close-circle',
  plus: 'add',
  flag: 'flag-outline',
  lock: 'lock-closed-outline',
  coffee: 'cafe-outline',
};

const glyphs: Record<string, number> | undefined = (Ionicons as any)?.glyphMap;

export default function LineIcon({ name, size = 18, color = colors.text, style }: {
  name: string; size?: number; color?: string; style?: any;
}) {
  const line = LINE[name];
  if (line && (!glyphs || line in glyphs)) {
    // Outlines read lighter than solid glyphs at the same size; nudge them up.
    return <Ionicons name={line as any} size={Math.round(size * 1.15)} color={color} style={style} />;
  }
  return <Icon name={name} size={size} color={color} style={style} />;
}
