import 'react-native-reanimated';
import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme, RouteProp } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar, View, Text } from 'react-native';
import { colors as DarkColors } from './src/theme/colors';
import * as SplashScreen from 'expo-splash-screen';
import { ErrorBoundary } from './src/components/ErrorBoundary';

import DashboardScreen from './src/screens/DashboardScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import AIAccountantScreen from './src/screens/AIAccountantScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import PaymentMethodScreen from './src/screens/PaymentMethodScreen';
import PaymentWebViewScreen from './src/screens/PaymentWebViewScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import CustomSplashScreen from './src/screens/SplashScreen';
import { AuthProvider, useAuth } from './src/services/AuthService';
import { getSubscriptionStatus } from './src/services/SubscriptionManager';
// SQLite sync removed: Supabase is the source of truth
// import { initDB } from './src/services/Database';
// import { syncTransactions } from './src/services/SyncService';
import { CurrencyProvider } from './src/services/CurrencyProvider';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { DateFilterProvider } from './src/contexts/DateFilterContext';
import AuthScreen from './src/screens/AuthScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
// import { SplashScreen as CustomSplashScreen } from './src/components/SplashScreen'; // Commented out
// Debug panel removed from production UI

// Keep the native splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  // ignore if it's already prevented
});

type RootTabParamList = {
  Dashboard: undefined;
  Transactions: undefined;
  Reports: undefined;
  AI: undefined;
};

type RootStackParamList = {
  MainTabs: undefined;
  Profile: undefined;
  Welcome: undefined;
  Subscription: undefined;
  PaymentMethod: {
    plan: string;
    amount: number;
    planTitle: string;
  };
  PaymentWebView: {
    url: string;
    reference: string;
    plan: string;
    amount: number;
  };
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

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

function MainTabNavigator() {
  const { colors } = useTheme();
  
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }: { route: RouteProp<RootTabParamList, keyof RootTabParamList> }) => ({
        tabBarIcon: (
          { focused, color, size }: { focused: boolean; color: string; size: number }
        ) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = 'home-outline';
          } else if (route.name === 'Transactions') {
            iconName = 'list-outline';
          } else if (route.name === 'Reports') {
            iconName = 'bar-chart-outline';
          } else if (route.name === 'AI') {
            iconName = 'chatbubbles-outline';
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
        name="AI" 
        component={AIAccountantScreen}
        options={{ 
          headerShown: false,
          tabBarLabel: 'AI',
        }}
      />
    </Tab.Navigator>
  );
}

function AppContainer() {
  const { user, loading, needsPasswordReset } = useAuth();
  const { colors } = useTheme();
  const [trialExpired, setTrialExpired] = React.useState(false);
  const [showSplash, setShowSplash] = React.useState(true);

  // Check trial status when user logs in
  useEffect(() => {
    async function checkTrialStatus() {
      if (user && !loading) {
        const status = await getSubscriptionStatus(user.id);
        setTrialExpired(status.trialEnded && !status.isActive);
      }
    }
    checkTrialStatus();
  }, [user, loading]);

  // Hide the native splash when custom splash is ready
  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loading]);

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  // Show custom splash screen
  if (showSplash) {
    return <CustomSplashScreen onFinish={handleSplashFinish} />;
  }
  
  // If still loading and we don't yet know the user, show a simple loading indicator
  if (loading && !user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar barStyle={colors.background === '#FFFFFF' ? 'dark-content' : 'light-content'} backgroundColor={colors.background} />
        <Text style={{ color: colors.text, fontSize: 18 }}>Loading...</Text>
      </View>
    );
  }

  if (needsPasswordReset) {
    return <ResetPasswordScreen />;
  }

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar barStyle={colors.background === '#FFFFFF' ? 'dark-content' : 'light-content'} backgroundColor={colors.background} />
        <AuthScreen />
      </View>
    );
  }

  // Check if user is new (first time signup)
  const isNewUser = user?.user_metadata?.is_new_user === true;

  // Determine initial route
  const getInitialRoute = () => {
    if (isNewUser) return 'Welcome';
    if (trialExpired) return 'Subscription';
    return 'MainTabs';
  };

  return (
    <NavigationContainer theme={makeNavTheme(colors)}>
      <StatusBar barStyle={colors.background === '#FFFFFF' ? 'dark-content' : 'light-content'} backgroundColor={colors.background} />
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName={getInitialRoute()}
      >
        <RootStack.Screen name="MainTabs" component={MainTabNavigator} />
        <RootStack.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{
            presentation: 'card',
            animation: 'slide_from_right',
          }}
        />
        <RootStack.Screen 
          name="Welcome" 
          component={WelcomeScreen}
          options={{
            presentation: 'card',
            animation: 'fade',
            gestureEnabled: false,
          }}
        />
        <RootStack.Screen 
          name="Subscription" 
          component={SubscriptionScreen}
          options={{
            presentation: 'card',
            animation: 'slide_from_right',
          }}
        />
        <RootStack.Screen 
          name="PaymentMethod" 
          component={PaymentMethodScreen}
          options={{
            presentation: 'card',
            animation: 'slide_from_right',
          }}
        />
        <RootStack.Screen 
          name="PaymentWebView" 
          component={PaymentWebViewScreen}
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log to crash reporting service in production
        console.error('App Error:', error, errorInfo);
      }}
    >
      <CurrencyProvider>
        <ThemeProvider>
          <AuthProvider>
            <DateFilterProvider>
              <AppContainer />
            </DateFilterProvider>
          </AuthProvider>
        </ThemeProvider>
      </CurrencyProvider>
    </ErrorBoundary>
  );
}
