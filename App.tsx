import 'react-native-gesture-handler';
import React from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, InstrumentSans_500Medium } from '@expo-google-fonts/instrument-sans';
import { Poppins_900Black_Italic } from '@expo-google-fonts/poppins';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/api/AuthContext';
import { AppAlertProvider, useAppAlert } from './src/components/AppAlert';
import { useOtaUpdate } from './src/hooks/useOtaUpdate';
import { usePushNotifications } from './src/hooks/usePushNotifications';

// Without this the native splash hides itself the instant the JS bundle
// finishes loading, which is before React has mounted anything — a visible
// flash of blank white between the splash and the first screen. Holding it
// here and releasing it in `Root` once session restore has settled means the
// splash hands straight over to a painted screen. Must run at module load,
// before the first render.
SplashScreen.preventAutoHideAsync().catch(() => {});
import WelcomeScreen from './src/screens/WelcomeScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ProfileScreen from './src/screens/shared/ProfileScreen';
import ReportIssueScreen from './src/screens/shared/ReportIssueScreen';
import AppDrawerContent from './src/components/AppDrawerContent';

import WorkerHome from './src/screens/worker/WorkerHome';

import DailyReportScreen from './src/screens/manager/DailyReportScreen';
import WorkersReportScreen from './src/screens/manager/WorkersReportScreen';
import VarianceReportScreen from './src/screens/manager/VarianceReportScreen';
import StaleReportScreen from './src/screens/manager/StaleReportScreen';
import ExceptionsReportScreen from './src/screens/manager/ExceptionsReportScreen';
import HandoversReportScreen from './src/screens/manager/HandoversReportScreen';
import CancellationsReportScreen from './src/screens/manager/CancellationsReportScreen';
import StaffScreen from './src/screens/manager/StaffScreen';
import CashHandoverScreen from './src/screens/manager/CashHandoverScreen';
import ManagerDashboardScreen from './src/screens/manager/ManagerDashboardScreen';

import PlatformOverviewScreen from './src/screens/sysadmin/PlatformOverviewScreen';
import OrganizationsScreen from './src/screens/sysadmin/OrganizationsScreen';
import PlatformAdminsScreen from './src/screens/sysadmin/PlatformAdminsScreen';
import BillingScreen from './src/screens/sysadmin/BillingScreen';
import OrgDetailScreen from './src/screens/sysadmin/OrgDetailScreen';

import OrgDashboardScreen from './src/screens/orgadmin/DashboardScreen';
import OrgBranchesScreen from './src/screens/orgadmin/BranchesScreen';
import OrgCatalogueScreen from './src/screens/orgadmin/CatalogueScreen';
import OrgPricesScreen from './src/screens/orgadmin/OrgPricesScreen';
import LoyaltySettingsScreen from './src/screens/orgadmin/LoyaltySettingsScreen';
import CustomersScreen from './src/screens/orgadmin/CustomersScreen';
import AuditLogScreen from './src/screens/orgadmin/AuditLogScreen';

import ClientHome from './src/screens/client/ClientHome';
import HistoryScreen from './src/screens/client/HistoryScreen';
import LoyaltyScreen from './src/screens/client/LoyaltyScreen';
import LedgerScreen from './src/screens/client/LedgerScreen';
import BranchScanScreen from './src/screens/client/BranchScanScreen';
import BookWashScreen from './src/screens/client/BookWashScreen';
import PaymentMethodScreen from './src/screens/client/PaymentMethodScreen';
import PaymentSuccessScreen from './src/screens/client/PaymentSuccessScreen';

import { View } from 'react-native';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

const drawerScreenOptions = {
  headerShown: false,
  drawerActiveTintColor: colors.primary,
  drawerType: 'front' as const,
};

function WorkerDrawer() {
  return (
    <Drawer.Navigator screenOptions={drawerScreenOptions} drawerContent={(p) => <AppDrawerContent {...p} />}>
      <Drawer.Screen name="Current Car" component={WorkerHome} />
      <Drawer.Screen name="Report a problem" component={ReportIssueScreen} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
    </Drawer.Navigator>
  );
}

function ManagerDrawer() {
  return (
    <Drawer.Navigator screenOptions={drawerScreenOptions} drawerContent={(p) => <AppDrawerContent {...p} />}>
      <Drawer.Screen name="Home" component={ManagerDashboardScreen} />
      <Drawer.Screen name="Cash Handover" component={CashHandoverScreen} />
      <Drawer.Screen name="Daily Report" component={DailyReportScreen} />
      <Drawer.Screen name="Performance" component={WorkersReportScreen} />
      <Drawer.Screen name="Cash Variance" component={VarianceReportScreen} />
      <Drawer.Screen name="Stale Alerts" component={StaleReportScreen} />
      <Drawer.Screen name="Exceptions" component={ExceptionsReportScreen} />
      <Drawer.Screen name="Handovers" component={HandoversReportScreen} />
      <Drawer.Screen name="Cancellations" component={CancellationsReportScreen} />
      <Drawer.Screen name="Staff" component={StaffScreen} />
      <Drawer.Screen name="Catalogue" component={OrgCatalogueScreen} />
      <Drawer.Screen name="Prices" component={OrgPricesScreen} />
      <Drawer.Screen name="Report a problem" component={ReportIssueScreen} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
    </Drawer.Navigator>
  );
}

function OrgadminDrawer() {
  return (
    <Drawer.Navigator screenOptions={drawerScreenOptions} drawerContent={(p) => <AppDrawerContent {...p} />}>
      <Drawer.Screen name="Home" component={OrgDashboardScreen} />
      <Drawer.Screen name="Cash Handover" component={CashHandoverScreen} />
      <Drawer.Screen name="Branches" component={OrgBranchesScreen} />
      <Drawer.Screen name="Staff" component={StaffScreen} />
      <Drawer.Screen name="Catalogue" component={OrgCatalogueScreen} />
      <Drawer.Screen name="Prices" component={OrgPricesScreen} />
      <Drawer.Screen name="Loyalty Settings" component={LoyaltySettingsScreen} />
      <Drawer.Screen name="Customers" component={CustomersScreen} />
      <Drawer.Screen name="Daily Report" component={DailyReportScreen} />
      <Drawer.Screen name="Performance" component={WorkersReportScreen} />
      <Drawer.Screen name="Cash Variance" component={VarianceReportScreen} />
      <Drawer.Screen name="Stale Alerts" component={StaleReportScreen} />
      <Drawer.Screen name="Exceptions" component={ExceptionsReportScreen} />
      <Drawer.Screen name="Handovers" component={HandoversReportScreen} />
      <Drawer.Screen name="Cancellations" component={CancellationsReportScreen} />
      <Drawer.Screen name="Audit Log" component={AuditLogScreen} />
      <Drawer.Screen name="Report a problem" component={ReportIssueScreen} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
    </Drawer.Navigator>
  );
}

function SysadminDrawer() {
  return (
    <Drawer.Navigator screenOptions={drawerScreenOptions} drawerContent={(p) => <AppDrawerContent {...p} />}>
      <Drawer.Screen name="Overview" component={PlatformOverviewScreen} />
      <Drawer.Screen name="Organizations" component={OrganizationsScreen} />
      <Drawer.Screen name="Billing" component={BillingScreen} />
      <Drawer.Screen name="Platform Admins" component={PlatformAdminsScreen} />
      <Drawer.Screen name="Report a problem" component={ReportIssueScreen} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
      {/* Reached by tapping an org, not from the menu — see HIDDEN_ROUTES. */}
      <Drawer.Screen name="Org Detail" component={OrgDetailScreen} />
    </Drawer.Navigator>
  );
}

function ClientDrawer() {
  return (
    <Drawer.Navigator screenOptions={drawerScreenOptions} drawerContent={(p) => <AppDrawerContent {...p} />}>
      <Drawer.Screen name="Active Wash" component={ClientHome} />
      <Drawer.Screen name="History" component={HistoryScreen} />
      <Drawer.Screen name="Loyalty" component={LoyaltyScreen} />
      <Drawer.Screen name="Ledger" component={LedgerScreen} />
      <Drawer.Screen name="Report a problem" component={ReportIssueScreen} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
    </Drawer.Navigator>
  );
}

/**
 * There is one splash, and it is the native one.
 *
 * This used to render `BrandSplash` — the same gradient and wordmark, in
 * React — on top of the navigator for a fixed six seconds. That produced
 * two splashes back to back: Android's, then an almost identical JS one,
 * with a visible seam between them and six seconds of waiting after the app
 * was already usable.
 *
 * The native splash now carries the branding itself (a pre-rendered
 * `splash-branded.png` of that same gradient and wordmark, configured in
 * app.json). It is on screen from the moment the process starts — genuinely
 * before any JavaScript — and is dismissed by `hideAsync()` as soon as the
 * first real screen is ready. Nothing is held artificially.
 */
function Root() {
  const { loading } = useAuth();

  // Release the native splash once session restore has settled, so it hands
  // straight over to a painted screen rather than a blank frame.
  React.useEffect(() => {
    if (loading) return;
    SplashScreen.hideAsync().catch(() => {});
  }, [loading]);

  return <RootNavigator />;
}

function RootNavigator() {
  const { actor, loading } = useAuth();
  // Registers this device's push token once an actor is known. The server
  // has always sent a real push on "car ready" and similar events — this is
  // what actually delivers it, by giving it a token to send to.
  usePushNotifications(actor?.id);

  // Session restore is still in flight — nothing can be routed yet. The
  // splash is covering this, so it only has to hold the frame, not fill it.
  if (loading) {
    return <View style={{ flex: 1, backgroundColor: colors.gradientSplash[0] }} />;
  }

  if (!actor) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
      </Stack.Navigator>
    );
  }

  // Route by role — a real, persistent sidebar shell per role
  const role = actor.role || actor.type;
  const roleDrawers: Record<string, React.ComponentType<any>> = {
    worker: WorkerDrawer,
    manager: ManagerDrawer,
    orgadmin: OrgadminDrawer,
    sysadmin: SysadminDrawer,
    platform: SysadminDrawer,
    client: ClientDrawer,
  };

  const RoleDrawer = roleDrawers[role] || ClientDrawer;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="App" component={RoleDrawer} />
      {role === 'client' && (
        <>
          {/* Scanning the branch's wall QR — matches ScannerSheet's own
              full-bleed dark UI, so it isn't boxed into a smaller card. */}
          <Stack.Screen name="BranchScan" component={BranchScanScreen} options={{ presentation: 'fullScreenModal' }} />
          {/* A full-screen multi-field form, not a light sheet. */}
          <Stack.Screen name="BookWash" component={BookWashScreen} options={{ presentation: 'fullScreenModal' }} />
          {/* No separate progress screen — the 3-stage tracker lives on
              ClientHome itself now, so booking pops straight back there. */}
          <Stack.Screen name="PaymentMethod" component={PaymentMethodScreen} options={{ presentation: 'modal' }} />
          {/* Matches PaymentReceipt's own internal full-screen Modal. */}
          <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} options={{ presentation: 'fullScreenModal' }} />
        </>
      )}
    </Stack.Navigator>
  );
}

/**
 * Prompts once a background OTA update has finished downloading. Lives
 * inside all the providers so it can raise the same alert used everywhere
 * else, and so a reload here also re-runs AuthProvider's boot check.
 */
function OtaUpdatePrompt() {
  const { ready, apply } = useOtaUpdate();
  const alert = useAppAlert();
  const [asked, setAsked] = React.useState(false);

  React.useEffect(() => {
    if (!ready || asked) return;
    setAsked(true);
    alert(
      'Update ready',
      'A new version has downloaded. Restart now to use it, or keep going and it applies next time you open the app.',
      [
        { text: 'Later', style: 'cancel' },
        { text: 'Restart now', onPress: apply },
      ]
    );
  }, [ready, asked, alert, apply]);

  return null;
}

export default function App() {
  // The native splash is already held by preventAutoHideAsync() above, so
  // there is nothing extra to gate here — returning null for these few
  // frames just leaves the native splash up a moment longer, rather than
  // letting text flash in the system font and re-flow once the real faces
  // arrive.
  const [fontsLoaded] = useFonts({ InstrumentSans_500Medium, Poppins_900Black_Italic });
  if (!fontsLoaded) return null;

  // SafeAreaProvider must sit above everything: React Navigation reads its
  // context, and without it insets resolve to zero or get applied twice.
  return (
    <SafeAreaProvider>
      {/* Every screen past login opens with a pink/ink gradient at the very
          top (ScreenHeader) or is the dark AuthShell — light icons are
          correct everywhere in this app, so it's set once here rather than
          per screen, where it had only ever been set on the login screen. */}
      <StatusBar style="light" />
      <AppAlertProvider>
        <AuthProvider>
          <NavigationContainer>
            <Root />
          </NavigationContainer>
          <OtaUpdatePrompt />
        </AuthProvider>
      </AppAlertProvider>
    </SafeAreaProvider>
  );
}
