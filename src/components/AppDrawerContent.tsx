import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useAuth } from '../api/AuthContext';
import { colors, radii, font, spacing, weight, tracking } from '../theme';
import Icon from './Icon';

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
  'Ledger': 'list-alt',
  'My Code': 'qrcode',
  'Profile': 'user-circle',
  'Home': 'home',
  'Branches': 'building',
  'Catalogue': 'th-large',
  'Org Prices': 'tags',
  'Loyalty Settings': 'star-half-alt',
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
  { title: 'Today', routes: ['Shift & Queue', 'Active Wash', 'Home', 'Overview', 'Cash Handover', 'Daily Report'] },
  { title: 'Reports', routes: ['Performance', 'Cash Variance', 'Stale Alerts', 'Exceptions', 'Handovers', 'Cancellations', 'History', 'Ledger', 'Audit Log'] },
  { title: 'Manage', routes: ['Staff', 'Branches', 'Catalogue', 'Org Prices', 'Loyalty Settings', 'Customers', 'Organizations', 'Billing', 'Platform Admins'] },
  { title: 'You', routes: ['Loyalty', 'My Code', 'Profile'] },
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

    return (
      <TouchableOpacity
        key={route.key}
        onPress={() => props.navigation.navigate(route.name)}
        style={[styles.item, focused && styles.itemActive]}
        activeOpacity={0.7}
      >
        {focused ? <View style={styles.activeBar} /> : null}
        <View style={[styles.itemIcon, focused && styles.itemIconActive]}>
          <Icon
            name={ROUTE_ICON[route.name] || 'circle'}
            size={13}
            color={focused ? '#fff' : 'rgba(255,255,255,0.55)'}
          />
        </View>
        <Text style={[styles.itemLabel, focused && styles.itemLabelActive]} numberOfLines={1}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Identity */}
        <View style={styles.header}>
          <LinearGradient
            colors={colors.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Icon name={ROLE_ICON[role] || 'user'} size={18} color="#fff" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
          </View>
        </View>

        <View style={styles.roleBadge}>
          <View style={styles.roleDot} />
          <Text style={styles.roleBadgeText}>{(ROLE_LABEL[role] || role).toUpperCase()}</Text>
        </View>

        {/* Grouped nav */}
        <ScrollView style={styles.menu} contentContainerStyle={styles.menuContent} showsVerticalScrollIndicator={false}>
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
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink[900] },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  avatar: {
    width: 44, height: 44, borderRadius: radii.full,
    alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: font.lg, fontWeight: weight.heavy, color: '#fff', letterSpacing: tracking.tight },
  subtitle: { fontSize: font.sm, color: 'rgba(255,255,255,0.55)', marginTop: 1 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  roleDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.success },
  roleBadgeText: { color: 'rgba(255,255,255,0.85)', fontSize: font.micro, fontWeight: weight.heavy, letterSpacing: tracking.capsWide },

  menu: { flex: 1, marginTop: spacing.lg },
  menuContent: { paddingBottom: spacing.lg, paddingHorizontal: spacing.md },
  group: { marginBottom: spacing.lg },
  groupTitle: {
    fontSize: font.micro,
    fontWeight: weight.heavy,
    color: 'rgba(255,255,255,0.32)',
    letterSpacing: tracking.capsWide,
    marginBottom: spacing.sm,
    marginLeft: spacing.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    marginBottom: 2,
  },
  itemActive: { backgroundColor: 'rgba(255,255,255,0.09)' },
  activeBar: {
    position: 'absolute',
    left: 0, top: 10, bottom: 10,
    width: 3,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  itemIcon: {
    width: 28, height: 28, borderRadius: radii.sm,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  itemIconActive: { backgroundColor: colors.primary },
  itemLabel: { fontSize: font.regular, fontWeight: weight.semibold, color: 'rgba(255,255,255,0.6)', flex: 1 },
  itemLabelActive: { color: '#fff', fontWeight: weight.bold },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.10)',
  },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 8 },
  logoutIcon: {
    width: 28, height: 28, borderRadius: radii.sm,
    backgroundColor: colors.error + '1F',
    alignItems: 'center', justifyContent: 'center',
  },
  logoutText: { fontSize: font.regular, fontWeight: weight.bold, color: colors.error },
});
