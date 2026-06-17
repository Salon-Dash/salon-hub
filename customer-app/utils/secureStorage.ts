import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SECURE_STORE_AVAILABLE = true;

export async function setItem(key: string, value: string): Promise<void> {
  try {
    if (SECURE_STORE_AVAILABLE) {
      await SecureStore.setItemAsync(key, value);
    } else {
      await AsyncStorage.setItem(key, value);
    }
  } catch {
    await AsyncStorage.setItem(key, value);
  }
}

export async function getItem(key: string): Promise<string | null> {
  try {
    if (SECURE_STORE_AVAILABLE) {
      return await SecureStore.getItemAsync(key);
    }
    return await AsyncStorage.getItem(key);
  } catch {
    return AsyncStorage.getItem(key);
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    if (SECURE_STORE_AVAILABLE) {
      await SecureStore.deleteItemAsync(key);
    } else {
      await AsyncStorage.removeItem(key);
    }
  } catch {
    await AsyncStorage.removeItem(key);
  }
}
