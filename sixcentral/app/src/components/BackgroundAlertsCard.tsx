// app/src/components/BackgroundAlertsCard.tsx
//
// Android only. Some manufacturers throttle background delivery so hard that
// FCM messages sit in a queue until the app is next opened. The fix has to be
// made by the person on their own phone, so once alerts are on we ask them
// once, on the brands known to do it, and take them straight to the screen.
//
// Pure JS on top of modules already in the binary, so this ships over the air.

import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C } from '@/lib/theme';

const DONE_KEY = 'sixcentral.push.background.v1';

// Manufacturer strings as reported by expo-device, lower-cased.
const AGGRESSIVE = ['oneplus', 'oppo', 'realme', 'xiaomi', 'redmi', 'poco', 'huawei', 'honor', 'vivo', 'samsung', 'meizu', 'asus'];

function isAggressiveBrand(): boolean {
  const m = (Device.manufacturer ?? Device.brand ?? '').toLowerCase();
  return AGGRESSIVE.some((b) => m.includes(b));
}

export default function BackgroundAlertsCard() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    (async () => {
      try {
        if (!isAggressiveBrand()) return;
        if (await AsyncStorage.getItem(DONE_KEY)) return;
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') return;
        setShow(true);
      } catch {
        // Never let this take the feed down.
      }
    })();
  }, []);

  if (!show) return null;

  async function markDone() {
    try {
      await AsyncStorage.setItem(DONE_KEY, '1');
    } catch {
      // Storage hiccup. Worst case the card shows once more.
    }
    setShow(false);
  }

  async function openBatterySettings() {
    try {
      // System list of battery-optimised apps. No special permission needed.
      await Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS');
    } catch {
      try {
        // Fallback: the app info page, where Battery is one tap away.
        await Linking.openSettings();
      } catch {
        // Nothing else to try.
      }
    }
    await markDone();
  }

  return (
    <View style={st.card}>
      <Pressable style={st.close} hitSlop={10} onPress={markDone}>
        <Text style={st.closeText}>✕</Text>
      </Pressable>
      <Text style={st.kicker}>One more step</Text>
      <Text style={st.title}>Stop your phone holding back alerts</Text>
      <Text style={st.body}>
        {Device.manufacturer ?? 'Your phone'} limits apps in the background, which can delay
        alerts by hours. Find SixCentral in the list and choose Do not optimise, or Unrestricted.
      </Text>
      <Pressable style={st.btn} onPress={openBatterySettings}>
        <Text style={st.btnText}>Open battery settings</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    borderColor: C.cyan,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    backgroundColor: 'rgba(31,229,214,0.07)',
  },
  close: { position: 'absolute', top: 10, right: 12, zIndex: 2 },
  closeText: { color: C.dim, fontSize: 13, fontWeight: '900' },
  kicker: {
    color: C.cyan,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  title: { color: C.text, fontSize: 17, fontWeight: '900', lineHeight: 22 },
  body: { color: C.muted, marginTop: 6, fontSize: 13, lineHeight: 19 },
  btn: {
    alignSelf: 'flex-start',
    backgroundColor: C.cyan,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 12,
  },
  btnText: {
    color: '#0B0810',
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
