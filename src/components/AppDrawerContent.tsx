import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useAuth } from '../api/AuthContext';
import { colors, radii, font, spacing, weight, tracking } from '../theme';
import Icon from './Icon';
import CssGradient from './CssGradient';
import CarWashLogo from './CarWashLogo';
import Era92Logo from './Era92Logo';

const ROLE_LABEL: Record<string, string> = {
  worker: 'Worker',
  manager: 'Manager',
  orgadmin: 'Org Admin',
  sysadmin: 'Platform Admin',
  client: 'Client',
};

const ROLE_ICON: Record<string, string> = {
  // 'hard-hat', not 'user-hard-hat' — the latter is FontAwesome 5 Pro only
  // and throws "not a valid icon name" with the free set bundled here.
  worker: 'hard-hat',
  manager: 'user-tie',
  orgadmin: 'user-tie',
  sysadmin: 'user-cog',
  client: 'user',
};

const ROUTE_ICON: Record<string, string> = {
  'Current Car': 'car',
  'My Account': 'wallet',
  'My Points': 'award',
  'Leaderboard': 'trophy',
  'Shift & Queue': 'sync-alt',
  'Daily Report': 'chart-bar',
  'Performance': 'hard-hat',
  'Cash Variance': 'coins',
  'Cash Handover': 'hand-holding-usd',
  'Stale Alerts': 'exclamation-triangle',
  'Exceptions': 'clipboard-list',
  'Handovers': 'handshake',
  'Cancellations': 'times-circle',
  'Staff': 'users',
  'Overview': 'chart-pie',
  'Organizations': 'building',
  'Platform Admins': 'user-shield',
  'Active Wash': 'car',
  'History': 'history',
  'Loyalty': 'star',
  'Points History': 'list-alt',
  'Profile': 'user-circle',
  'Report a problem': 'life-ring',
  'Home': 'home',
  'Branches': 'building',
  'Catalogue': 'th-large',
  'Prices': 'tags',
  'Points Settings': 'star-half-alt',
  'Customers': 'address-book',
  'Audit Log': 'shield-alt',
  'Billing': 'file-invoice-dollar',
};

// Routes registered so they can be navigated to, but which are reached from
// inside another screen rather than picked off the menu. Listing them here
// keeps them out of the drawer without a second navigator.
const HIDDEN_ROUTES = new Set(['Org Detail']);

// Grouping gives long role menus a readable structure instead of one flat list.
const GROUPS: { title: string; routes: string[] }[] = [
  { title: 'Today', routes: ['Current Car', 'Shift & Queue', 'Active Wash', 'Home', 'Overview', 'Cash Handover', 'Daily Report'] },
  { title: 'Reports', routes: ['Performance', 'Cash Variance', 'Stale Alerts', 'Exceptions', 'Handovers', 'Cancellations', 'History', 'Points History', 'Audit Log'] },
  { title: 'Manage', routes: ['Staff', 'Branches', 'Catalogue', 'Prices', 'Points Settings', 'Customers', 'Organizations', 'Billing', 'Platform Admins'] },
  { title: 'You', routes: ['My Account', 'My Points', 'Leaderboard', 'Loyalty', 'Report a problem', 'Profile'] },
];

export default function AppDrawerContent(props: DrawerContentComponentProps) {
  const { actor, logout } = useAuth();
  const role = actor?.role || actor?.type || 'client';
  const name = actor?.full_name || (role === 'client' ? actor?.username : ROLE_LABEL[role]) || 'Account';
  const subtitle = actor?.branch_name || actor?.org_name || (role === 'client' ? actor?.username : ROLE_LABEL[role]);

  const routes = props.state.routes;
  const routeNames = routes.map((r) => r.name).filter((n) => !HIDDEN_ROUTES.has(n));

  // Bucket the live routes into groups; anything unmatched falls through to "More".
  const grouped = GROUPS
    .map((g) => ({ title: g.title, routes: g.routes.filter((r) => routeNames.includes(r)) }))
    .filter((g) => g.routes.length > 0);
  const claimed = new Set(grouped.flatMap((g) => g.routes));
  const leftover = routeNames.filter((r) => !claimed.has(r));
  if (leftover.length) grouped.push({ title: 'More', routes: leftover });

  const renderItem = (routeName: string) => {
    const index = routes.findIndex((r) => r.name === routeName);
    if (index === -1) return null;
    const route = routes[index];
    const focused = props.state.index === index;
    const options = props.descriptors[route.key].options;
    const label = (options.drawerLabel as string) || options.title || route.name;

    const content = (
      <>
        <View style={[styles.itemIcon, focused && styles.itemIconActive]}>
          <Icon name={ROUTE_ICON[route.name] || 'circle'} size={13} color={focused ? '#fff' : BRAND_VIOLET} />
        </View>
        <Text style={[styles.itemLabel, focused && styles.itemLabelActive]} numberOfLines={1}>{label}</Text>
        {focused ? <Icon name="chevron-right" size={10} color="rgba(255,255,255,0.85)" /> : null}
      </>
    );

    return (
      <TouchableOpacity
        key={route.key}
        onPress={() => props.navigation.navigate(route.name)}
        style={styles.itemTouch}
        activeOpacity={0.7}
      >
        {focused ? (
          // The active item wears the same violet→navy gradient as the
          // client app's buttons, so the menu reads as part of one brand.
          <CssGradient
            colors={colors.gradientButton}
            locations={[0.05, 0.75]}
            angle={100}
            style={[styles.item, styles.itemActive]}
          >
            {content}
          </CssGradient>
        ) : (
          <View style={styles.item}>{content}</View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Brand mark — the same lockup as the client app's top bar. */}
        <View style={styles.brand}>
          <CarWashLogo height={24} />
        </View>

        {/* Who is signed in — a plain line, not a banner. */}
        <View style={styles.who}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {[ROLE_LABEL[role] || role, subtitle].filter(Boolean).join(' · ')}
          </Text>
        </View>

        {/* Grouped nav */}
        {/* Scrollbar on: a long menu (manager, org admin) runs past the screen,
            and without it nothing says there is more below. */}
        <ScrollView style={styles.menu} contentContainerStyle={styles.menuContent} showsVerticalScrollIndicator>
          {grouped.map((g) => (
            <View key={g.title} style={styles.group}>
              <Text style={styles.groupTitle}>{g.title.toUpperCase()}</Text>
              {g.routes.map(renderItem)}
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn} activeOpacity={0.7}>
            <View style={styles.logoutIcon}>
              <Icon name="sign-out-alt" size={13} color={colors.error} />
            </View>
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
          <View style={styles.productOf}>
            <Text style={styles.productOfText}>Product of</Text>
            <Era92Logo height={13} color={NAVY_MUTED} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

// The client app's palette: white surfaces, violet accent, deep-navy text.
const BRAND_VIOLET = '#AC00FF';
const NAVY = '#1B1F3B';
const NAVY_MUTED = '#8A90A6';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  safe: { flex: 1 },

  brand: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },

  who: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  name: { fontSize: font.regular, fontWeight: weight.heavy, color: NAVY, letterSpacing: tracking.tight },
  subtitle: { fontSize: font.xs, color: NAVY_MUTED, marginTop: 2, fontWeight: weight.medium },

  // minHeight 0 lets the list shrink to the space above the footer. Without
  // it the web build sized the list to its content, so the last items sat
  // underneath Log out — and tapping them signed people out.
  menu: { flex: 1, minHeight: 0, marginTop: spacing.lg },
  menuContent: { paddingBottom: spacing.lg, paddingHorizontal: spacing.md },
  group: { marginBottom: spacing.md },
  groupTitle: {
    fontSize: font.micro,
    fontWeight: weight.heavy,
    color: NAVY_MUTED,
    letterSpacing: tracking.capsWide,
    marginBottom: spacing.xs,
    marginLeft: spacing.md,
  },
  itemTouch: { marginBottom: 2 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 9,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
  },
  itemActive: { borderRadius: 14 },
  itemIcon: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: '#F4ECFF',
    alignItems: 'center', justifyContent: 'center',
  },
  itemIconActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  itemLabel: { fontSize: font.regular, fontWeight: weight.semibold, color: NAVY, flex: 1 },
  itemLabelActive: { color: '#fff', fontWeight: weight.bold },

  footer: {
    backgroundColor: '#fff',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E6E8F0',
  },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 8 },
  logoutIcon: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: colors.error + '1A',
    alignItems: 'center', justifyContent: 'center',
  },
  logoutText: { fontSize: font.regular, fontWeight: weight.bold, color: colors.error },
  productOf: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  productOfText: { fontSize: font.xs, color: NAVY_MUTED, fontWeight: weight.medium },
});
