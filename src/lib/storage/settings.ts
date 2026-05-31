import { useSyncExternalStore } from "react";
import { storageGet, storageSet, storageRemove } from "./storage";

const KEY = "feira:settings";

export interface Settings {
  ownerName: string;
  stallName: string;
  vibration: boolean;
  notifications: boolean;
  lowStockThreshold: number;
}

const defaults: Settings = {
  ownerName: "",
  stallName: "",
  vibration: true,
  notifications: true,
  lowStockThreshold: 1,
};

let state: Settings = defaults;
let initialized = false;
let initPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

async function load(): Promise<Settings> {
  try {
    const raw = await storageGet<Partial<Settings> | null>(KEY, null);
    return raw ? { ...defaults, ...raw } : defaults;
  } catch {
    return defaults;
  }
}

async function persist() {
  await storageSet(KEY, state);
}

function emit() {
  void persist().then(() => listeners.forEach((l) => l()));
}

export async function initSettings(): Promise<void> {
  if (initialized) return;
  if (!initPromise) {
    initPromise = load().then((loaded) => {
      state = loaded;
      initialized = true;
      listeners.forEach((l) => l());
    });
  }
  await initPromise;
}

export async function resetSettings(): Promise<void> {
  await storageRemove(KEY);
  state = defaults;
  initialized = true;
  listeners.forEach((l) => l());
}

export const settingsStore = {
  get(): Settings {
    return state;
  },
  update(patch: Partial<Settings>) {
    state = { ...state, ...patch };
    emit();
  },
};

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return state;
}

export function useSettings() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
