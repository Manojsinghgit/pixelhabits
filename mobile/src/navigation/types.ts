export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type HabitsStackParamList = {
  HabitList: undefined;
  CreateHabit: undefined;
  EditHabit: { habitId: number };
  HabitDetail: { habitId: number; habitName: string };
  ArchivedHabits: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  AccountSettings: undefined;
  Friends: undefined;
};

export type MainTabParamList = {
  HabitsTab: undefined;
  Calendar: undefined;
  Summary: undefined;
  ProfileTab: undefined;
};
