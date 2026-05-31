import AsyncStorage from "@react-native-async-storage/async-storage";

export async function storageGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function storageSet(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function storageRemove(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}
