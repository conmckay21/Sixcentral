// app/src/components/AlertsCard.tsx
//
// Sits on the news feed for anyone who has not turned alerts on. Dismissible,
// and it remembers the dismissal so it does not nag.
//
// Two states matter:
//  - canAskAgain: we can fire the system prompt directly.
//  - !canAskAgain: iOS will never prompt again, so the only route back is
//    the device settings screen. The button opens it.

import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePushRegistration } from '@/hooks/usePushRegistration';
import { C } from '@/lib/theme';

const DISMISS_KEY = 'sixcentral.push.card.dismissed.v1';

export default function AlertsCard() {
  const { registerForPush } = usePushRegistration();
  const [show, setShow] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const dismissed = await AsyncStorage.getItem(DISMISS_KEY);
        if (dismissed) return;
        const { status, canAskAgain } = await Notifications.getPermissionsAsync();
        if (status === 'granted') return;
        setBlocked(!canAskAgain);
        setShow(true);
      } catch {
        // Never let this take the feed down.
      }
    })();
  }, []);

  if (!show) return null;

  async function onPress() {
    if (busy) return;
    setBusy(true);
    try {
      if (blocked) {
        await Linking.openSettings();
        setShow(false);
        return;
      }
      const granted = await registerForPush();
      if (granted) {
        setShow(false);
        return;
      }
      const { canAskAgain } = await Notifications.getPermissionsAsync();
      setBlocked(!canAskAgain);
    } finally {
      setBusy(false);
    }
  }

  async function dismiss() {
    await AsyncStorage.setItem(DISMISS_KEY, '1');
    setShow(false);
  }

  return (
    <View style={st.card}>
      <Pressable style={st.close} hitSlop={10} onPress={dismiss}>
        <Text style={st.closeText}>✕</Text>
      </Pressable>
      <Text style={st.kicker}>Alerts · off</Text>
      <Text style={st.title}>Never miss a GTA 6 drop</Text>
      <Text style={st.body}>
        {blocked
          ? 'Notifications are switched off for SixCentral in your ' +
            (Platform.OS === 'ios' ? 'iPhone' : 'device') +
            ' settings. Turn them back on and we will take it from there.'
          : 'We will ping you the moment major news lands. Big stuff only, never every post.'}
      </Text>
      <Pressable style={[st.btn, busy && { opacity: 0.6 }]} onPress={onPress} disabled={busy}>
        <Text style={st.btnText}>
          {busy ? 'Just a sec…' : blocked ? 'Open settings' : 'Turn on alerts'}
        </Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    borderColor: C.pink,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    backgroundColor: 'rgba(255,46,136,0.07)',
  },
  close: { position: 'absolute', top: 10, right: 12, zIndex: 2 },
  closeText: { color: C.dim, fontSize: 13, fontWeight: '900' },
  kicker: {
    color: C.pink,
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
    backgroundColor: C.pink,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 12,
  },
  btnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
