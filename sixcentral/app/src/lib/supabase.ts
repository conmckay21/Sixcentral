import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Metro inlines EXPO_PUBLIC_* at bundle time; this keeps SDK 54's TS config happy.
declare const process: { env: Record<string, string | undefined> };

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.warn('Supabase env missing. Copy .env.example to .env and fill both values.');
}

/**
 * expo export statically renders routes in plain Node, where AsyncStorage's
 * web shim reaches for window.localStorage and crashes the export. Hand the
 * auth client a no-op store in that environment; devices and real browsers
 * still get AsyncStorage. Nothing changes at runtime on a phone.
 */
const isServerRender = typeof window === 'undefined';
const noopStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

export const supabase = createClient(url ?? 'https://example.supabase.co', anon ?? 'anon', {
  auth: {
    storage: isServerRender ? noopStorage : AsyncStorage,
    autoRefreshToken: !isServerRender,
    persistSession: !isServerRender,
    detectSessionInUrl: false,
  },
});
