export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type HabitsStackParamList = {
  HabitList: undefined;
  CreateHabit: undefined;
  EditHabit: { habitId: number };
  HabitDetail: { habitId: number; habitName: string };
};

export type MainTabParamList = {
  HabitsTab: undefined;
  Summary: undefined;
};
