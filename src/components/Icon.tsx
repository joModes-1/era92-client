import React from 'react';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { colors } from '../theme';

/**
 * Only the FontAwesome 5 *Free* set is bundled, so Pro-only names (e.g.
 * 'user-hard-hat') throw "not a valid icon name" at render time. A missing
 * glyph should never take a screen down, so unknown names fall back to a
 * neutral shape and log once in development.
 */
const FALLBACK = 'circle';
const warned = new Set<string>();

// glyphMap is exposed by createIconSet; guard the lookup in case it is not.
const glyphMap: Record<string, number> | undefined = (FontAwesome5 as any)?.glyphMap;

function safeName(name: string): string {
  if (!glyphMap || name in glyphMap) return name;
  if (__DEV__ && !warned.has(name)) {
    warned.add(name);
    console.warn(`[Icon] "${name}" is not in FontAwesome 5 Free — using "${FALLBACK}".`);
  }
  return FALLBACK;
}

export default function Icon({
  name,
  size = 18,
  color = colors.text,
  solid = true,
}: { name: string; size?: number; color?: string; solid?: boolean }) {
  return <FontAwesome5 name={safeName(name) as any} size={size} color={color} solid={solid} />;
}
