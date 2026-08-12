import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { SummaryScreen } from '../screens/SummaryScreen';
import { colors } from '../theme';
import { AuthNavigator } from './AuthNavigator';
import { HabitsNavigator } from './HabitsNavigator';
import { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen
        name="HabitsTab"
        component={HabitsNavigator}
        options={{ title: 'Habits', tabBarIcon: ({ color }) => <TabIcon symbol="✅" color={color} /> }}
      />
      <Tab.Screen
        name="Summary"
        component={SummaryScreen}
        options={{ title: 'Summary', tabBarIcon: ({ color }) => <TabIcon symbol="📊" color={color} /> }}
      />
    </Tab.Navigator>
  );
}

function TabIcon({ symbol }: { symbol: string; color: string }) {
  return <Text style={{ fontSize: 18 }}>{symbol}</Text>;
}

export function RootNavigator() {
  const { username, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return username ? <MainTabs /> : <AuthNavigator />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
