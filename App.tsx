import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar, ActivityIndicator, View } from 'react-native';
import { colors as DarkColors } from './src/theme/colors';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

import DashboardScreen from './src/screens/DashboardScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { AuthProvider, useAuth } from './src/services/AuthService';
import { initDB } from './src/services/Database';
import { syncTransactions } from './src/services/SyncService';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import AuthScreen from './src/screens/AuthScreen';

const Tab = createBottomTabNavigator();

function makeNavTheme(pal: typeof DarkColors) {
  return {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: pal.primary,
      background: pal.background,
      card: pal.surface,
      text: pal.text,
      border: pal.border,
      notification: pal.primary,
    },
  } as const;
}

function AppContainer() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    (async () => {
      await initDB();

      // Initial sync on startup if logged in
      if (user?.id) {
        try {
          await syncTransactions(user.id);
        } catch (e) {
          // Swallow errors to not block UI
          console.warn('Initial sync failed', e);
        }
      }

      // Listen to network changes to trigger sync
      unsubscribe = NetInfo.addEventListener(async (state: NetInfoState) => {
        if (state.isConnected && state.isInternetReachable && user?.id) {
          try {
            await syncTransactions(user.id);
          } catch (e) {
            console.warn('Sync on reconnect failed', e);
          }
        }
      });
    })();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.id]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <StatusBar barStyle={colors.background === '#FFFFFF' ? 'dark-content' : 'light-content'} backgroundColor={colors.background} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar barStyle={colors.background === '#FFFFFF' ? 'dark-content' : 'light-content'} backgroundColor={colors.background} />
        <AuthScreen />
      </View>
    );
  }

  return (
    <NavigationContainer theme={makeNavTheme(colors)}>
      <StatusBar barStyle={colors.background === '#FFFFFF' ? 'dark-content' : 'light-content'} backgroundColor={colors.background} />
      <Tab.Navigator
        initialRouteName="Dashboard"
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            if (route.name === 'Dashboard') {
              iconName = 'home-outline';
            } else if (route.name === 'Transactions') {
              iconName = 'list-outline';
            } else if (route.name === 'Reports') {
              iconName = 'bar-chart-outline';
            } else if (route.name === 'Settings') {
              iconName = 'settings-outline';
            } else {
              iconName = 'home-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.inactive,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        })}
      >
        <Tab.Screen 
          name="Dashboard" 
          component={DashboardScreen}
          options={{ headerShown: false }}
        />
        <Tab.Screen 
          name="Transactions" 
          component={TransactionsScreen}
          options={{ headerShown: false }}
        />
        <Tab.Screen 
          name="Reports" 
          component={ReportsScreen}
          options={{ headerShown: false }}
        />
        <Tab.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{ headerShown: false }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContainer />
      </AuthProvider>
    </ThemeProvider>
  );
}
