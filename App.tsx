import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/api/AuthContext';
import { AppAlertProvider } from './src/components/AppAlert';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ChangePasswordScreen from './src/screens/shared/ChangePasswordScreen';
import ProfileScreen from './src/screens/shared/ProfileScreen';
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

import ActiveWashScreen from './src/screens/client/ActiveWashScreen';
import HistoryScreen from './src/screens/client/HistoryScreen';
import LoyaltyScreen from './src/screens/client/LoyaltyScreen';
import LedgerScreen from './src/screens/client/LedgerScreen';
import MyCodeScreen from './src/screens/client/MyCodeScreen';
import StartWashQRScreen from './src/screens/client/StartWashQRScreen';
import PayWashQRScreen from './src/screens/client/PayWashQRScreen';

import { ActivityIndicator, View } from 'react-native';
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
      <Drawer.Screen name="Shift & Queue" component={WorkerHome} />
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
      <Drawer.Screen name="Org Prices" component={OrgPricesScreen} />
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
      <Drawer.Screen name="Profile" component={ProfileScreen} />
      {/* Reached by tapping an org, not from the menu — see HIDDEN_ROUTES. */}
      <Drawer.Screen name="Org Detail" component={OrgDetailScreen} />
    </Drawer.Navigator>
  );
}

function ClientDrawer() {
  return (
    <Drawer.Navigator screenOptions={drawerScreenOptions} drawerContent={(p) => <AppDrawerContent {...p} />}>
      <Drawer.Screen name="Active Wash" component={ActiveWashScreen} />
      <Drawer.Screen name="History" component={HistoryScreen} />
      <Drawer.Screen name="Loyalty" component={LoyaltyScreen} />
      <Drawer.Screen name="Ledger" component={LedgerScreen} />
      <Drawer.Screen name="My Code" component={MyCodeScreen} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
    </Drawer.Navigator>
  );
}

function RootNavigator() {
  const { actor, loading, mustChangePassword } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Must change password first
  if (actor && mustChangePassword) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      </Stack.Navigator>
    );
  }

  if (!actor) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
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
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ presentation: 'modal' }} />
      {role === 'client' && (
        <>
          <Stack.Screen name="StartWashQR" component={StartWashQRScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="PayWashQR" component={PayWashQRScreen} options={{ presentation: 'modal' }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  // SafeAreaProvider must sit above everything: React Navigation reads its
  // context, and without it insets resolve to zero or get applied twice.
  return (
    <SafeAreaProvider>
      <AppAlertProvider>
        <AuthProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </AppAlertProvider>
    </SafeAreaProvider>
  );
}
