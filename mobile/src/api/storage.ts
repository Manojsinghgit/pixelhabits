import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// expo-secure-store has no web implementation, so we fall back to AsyncStorage
// there. On iOS/Android, tokens go through the Keychain/Keystore.
const isWeb = Platform.OS === 'web';

export const storage = {
  async getItem(key: string): Promise<string | null> {
    return isWeb ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    return isWeb ? AsyncStorage.setItem(key, value) : SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string): Promise<void> {
    return isWeb ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key);
  },
};

export const STORAGE_KEYS = {
  accessToken: 'ph_access_token',
  refreshToken: 'ph_refresh_token',
  username: 'ph_username',
} as const;
