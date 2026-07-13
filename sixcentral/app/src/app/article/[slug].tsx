import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C, G, GRAD } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { voteBus } from '@/lib/voteBus';
import { SITE } from '@/lib/site';

type Block = { type: 'p' | 'h2' | 'ul'; text?: string; items?: string[] };
type Item = {
  slug: string;
  title: string;
  kicker: string;
  excerpt: string;
  updatedAt: string;
  readingMins: number;
  isRumour?: boolean;
  credibility?: number;
  heroImage?: { src: string; alt?: string; credit?: string };
  body: Block[];
};

export default function Article() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Item | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`${SITE}/api/content/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => setItem(j as Item))
      .catch(() => setFailed(true));
  }, [slug]);

  if (failed) {
    return (
      <SafeAreaView style={st.safe}>
        <View style={st.pad}>
          <Pressable onPress={() => router.back()}>
            <Text style={st.back}>← Back</Text>
          </Pressable>
          <Text style={st.muted}>Could not load that one. Check the connection and try again.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={st.safe}>
        <ActivityIndicator color={C.pink} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const date = new Date(item.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <SafeAreaView style={st.safe}>
      <ScrollView contentContainerStyle={st.pad} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()}>
          <Text style={st.back}>← Back</Text>
        </Pressable>

        <Text style={[st.kicker, item.isRumour && { color: C.gold }]}>
          {item.isRumour ? `Rumour Mill · heat ${item.credibility ?? '?'} of 5` : item.kicker}
        </Text>
        <Text style={st.h1}>{item.title}</Text>
        <Text style={st.meta}>
          {date} · {item.readingMins} min read
        </Text>

        {item.heroImage ? (
          <View style={st.heroWrap}>
            <Image source={{ uri: item.heroImage.src }} style={st.hero} resizeMode="cover" />
            {item.heroImage.credit ? <Text style={st.credit}>{item.heroImage.credit}</Text> : null}
          </View>
        ) : (
          <LinearGradient colors={G.hot} {...GRAD} style={st.heroFallback}>
            <Text style={st.heroFallbackText}>SIXCENTRAL</Text>
          </LinearGradient>
        )}

        {item.body.map((b, i) => {
          if (b.type === 'h2') {
            return (
              <Text key={i} style={st.h2}>
                {b.text}
              </Text>
            );
          }
          if (b.type === 'ul') {
            return (
              <View key={i} style={{ marginBottom: 14 }}>
                {(b.items ?? []).map((it, j) => (
                  <View key={j} style={st.li}>
                    <Text style={st.bullet}>▸</Text>
                    <Text style={st.liText}>{it}</Text>
                  </View>
                ))}
              </View>
            );
          }
          return (
            <Text key={i} style={st.p}>
              {b.text}
            </Text>
          );
        })}

        <Reactions slug={String(slug)} />

        <Text style={st.foot}>Verified before it is published. sixcentral.co.uk</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Reactions({ slug }: { slug: string }) {
  const [up, setUp] = useState<number | null>(null);
  const [down, setDown] = useState<number | null>(null);
  const [mine, setMine] = useState<0 | 1 | -1>(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(`sc-vote:${slug}`)
      .then((v) => {
        const n = Number(v ?? '0');
        if (n === 1 || n === -1) setMine(n);
      })
      .catch(() => {});
    fetch(`${SITE}/api/reactions?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: { up: number; down: number }) => {
        setUp(j.up);
        setDown(j.down);
      })
      .catch(() => {
        setUp(0);
        setDown(0);
      });
  }, [slug]);

  async function vote(v: 1 | -1) {
    if (busy || up === null || down === null) return;
    const next = mine === v ? 0 : v;
    const nextUp = up + (next === 1 ? 1 : 0) - (mine === 1 ? 1 : 0);
    const nextDown = down + (next === -1 ? 1 : 0) - (mine === -1 ? 1 : 0);
    setUp(nextUp);
    setDown(nextDown);
    setMine(next);
    voteBus.emit(slug, { up: nextUp, down: nextDown });
    setBusy(true);
    AsyncStorage.setItem(`sc-vote:${slug}`, String(next)).catch(() => {});
    try {
      let anonId = (await AsyncStorage.getItem('sc-anon-id')) ?? '';
      if (!anonId) {
        anonId = `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}-${Math.random().toString(16).slice(2, 10)}`;
        await AsyncStorage.setItem('sc-anon-id', anonId);
      }
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch(`${SITE}/api/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ slug, value: next, anonId }),
      });
      if (res.ok) {
        const j = await res.json();
        setUp(j.up);
        setDown(j.down);
        voteBus.emit(slug, { up: j.up, down: j.down });
      }
    } catch {}
    setBusy(false);
  }

  return (
    <View style={st.reactWrap}>
      <Text style={st.reactKicker}>Good intel?</Text>
      <View style={st.reactRow}>
        <Pressable onPress={() => vote(1)} style={[st.reactBtn, mine === 1 && st.reactBtnUp]}>
          <Text style={[st.reactText, mine === 1 && { color: C.green ?? '#35E27C' }]}>
            {'\u{1F44D}'} {up === null ? '\u00B7' : up}
          </Text>
        </Pressable>
        <Pressable onPress={() => vote(-1)} style={[st.reactBtn, mine === -1 && st.reactBtnDown]}>
          <Text style={[st.reactText, mine === -1 && { color: '#FF9E45' }]}>
            {'\u{1F44E}'} {down === null ? '\u00B7' : down}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  pad: { padding: 20, paddingBottom: 44 },
  back: { color: C.cyan, fontWeight: '800', marginBottom: 16, fontSize: 13 },
  kicker: { color: C.cyan, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 },
  h1: { color: C.text, fontSize: 26, fontWeight: '900', lineHeight: 31, textTransform: 'uppercase', letterSpacing: 0.5 },
  meta: { color: C.dim, fontSize: 11, marginTop: 8, textTransform: 'uppercase', letterSpacing: 1 },
  heroWrap: { marginTop: 16, marginBottom: 18 },
  hero: { width: '100%', aspectRatio: 16 / 9, borderRadius: 16, backgroundColor: C.surface },
  credit: { color: C.dim, fontSize: 10, marginTop: 6 },
  heroFallback: { marginTop: 16, marginBottom: 18, borderRadius: 16, height: 130, alignItems: 'center', justifyContent: 'center' },
  heroFallbackText: { color: 'rgba(255,255,255,0.9)', fontWeight: '900', letterSpacing: 4 },
  h2: { color: C.text, fontSize: 17, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginTop: 18, marginBottom: 8 },
  p: { color: C.muted, fontSize: 15, lineHeight: 24, marginBottom: 14 },
  li: { flexDirection: 'row', gap: 8, marginBottom: 8, paddingRight: 8 },
  bullet: { color: C.pink, fontWeight: '900', marginTop: 2 },
  liText: { color: C.muted, fontSize: 14, lineHeight: 21, flex: 1 },
  foot: { color: C.dim, fontSize: 11, marginTop: 24, textTransform: 'uppercase', letterSpacing: 1 },
  reactWrap: { marginTop: 26, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.09)', paddingTop: 16 },
  reactKicker: { color: C.dim, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 },
  reactRow: { flexDirection: 'row', gap: 10 },
  reactBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16 },
  reactBtnUp: { borderColor: '#35E27C', backgroundColor: 'rgba(53,226,124,0.10)' },
  reactBtnDown: { borderColor: '#FF9E45', backgroundColor: 'rgba(255,158,69,0.10)' },
  reactText: { color: C.muted, fontSize: 14, fontWeight: '700' },
  muted: { color: C.muted, lineHeight: 20 },
});
