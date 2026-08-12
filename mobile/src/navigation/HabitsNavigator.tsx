import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { HabitDetailScreen } from '../screens/HabitDetailScreen';
import { HabitFormScreen } from '../screens/HabitFormScreen';
import { HabitListScreen } from '../screens/HabitListScreen';
import { colors } from '../theme';
import { HabitsStackParamList } from './types';

const Stack = createNativeStackNavigator<HabitsStackParamList>();

const headerOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.text,
  headerShadowVisible: false,
};

export function HabitsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="HabitList" component={HabitListScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="CreateHabit"
        component={HabitFormScreen}
        options={{ title: 'New habit', ...headerOptions }}
      />
      <Stack.Screen
        name="EditHabit"
        component={HabitFormScreen}
        options={{ title: 'Edit habit', ...headerOptions }}
      />
      <Stack.Screen name="HabitDetail" component={HabitDetailScreen} options={headerOptions} />
    </Stack.Navigator>
  );
}
