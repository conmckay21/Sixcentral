import { useEffect, useState } from 'react';
import { FlatList, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { C, G, GRAD } from '@/lib/theme';
import { Chip, SectionTitle } from '@/components/ui';

const LAUNCH = new Date('2026-11-19T00:00:00Z').getTime();
const SITE = 'https://sixcentral.co.uk';

type Clip = { id: string; video_id: string };

function useCountdown() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, LAUNCH - now);
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
  };
}

export default function Home() {
  const { d, h, m } = useCountdown();
  const router = useRouter();
  const [clips, setClips] = useState<Clip[]>([]);

  useEffect(() => {
    supabase
      .from('clip_submissions')
      .select('id, video_id')
      .eq('status', 'approved')
      .gt('votes', -3)
      .order('votes', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (data) setClips(data as Clip[]);
      });
  }, []);

  return (
    <SafeAreaView style={st.safe}>
      <ScrollView contentContainerStyle={st.wrap} showsVerticalScrollIndicator={false}>
        <View style={st.header}>
          <Text style={st.brand}>
            <Text style={{ color: C.pink }}>SIX</Text>
            <Text style={{ color: C.cyan }}>CENTRAL</Text>
          </Text>
          <View style={st.cdChip}>
            <Text style={st.cdChipText}>
              ◷ {d}d {String(h).padStart(2, '0')}h {String(m).padStart(2, '0')}m
            </Text>
          </View>
        </View>

        <Pressable onPress={() => Linking.openURL(`${SITE}/news/everything-confirmed`)}>
          <LinearGradient colors={G.hot} {...GRAD} style={st.bigRead}>
            <View style={st.bigReadShade} />
            <Text style={st.bigKicker}>The big read · verified</Text>
            <Text style={st.bigTitle}>Everything confirmed about GTA 6, in one place</Text>
            <Text style={st.bigSub}>Read on sixcentral.co.uk →</Text>
          </LinearGradient>
        </Pressable>

        <SectionTitle>Latest</SectionTitle>
        {[
          ['The guides desk: A to Z, the moment there is a game to guide', `${SITE}/guides`],
          ['The clips feed is open. Get on it', `${SITE}/clips`],
        ].map(([t, url]) => (
          <Pressable key={url} style={st.latestRow} onPress={() => Linking.openURL(url)}>
            <Text style={st.latestText}>{t}</Text>
            <Text style={st.latestChev}>→</Text>
          </Pressable>
        ))}

        <View style={st.tip}>
          <Text style={st.tipKicker}>Tip · pre-orders</Text>
          <Text style={st.tipText}>
            Standard £69.99, Ultimate £89.99. The guides desk breaks down which is actually worth
            it before launch night.
          </Text>
        </View>

        <SectionTitle>Clip of the Month</SectionTitle>
        <Pressable onPress={() => router.push('/clips')}>
          <LinearGradient colors={G.gold} {...GRAD} style={st.comp}>
            <View style={st.bigReadShade} />
            <Text style={st.compTrophy}>🏆</Text>
            <Text style={st.compTitle}>Community votes. Winner takes free Premium.</Text>
            <Text style={st.compBtn}>Enter and vote →</Text>
          </LinearGradient>
        </Pressable>

        {clips.length > 0 && (
          <>
            <SectionTitle>Trending clips</SectionTitle>
            <FlatList
              horizontal
              data={clips}
              keyExtractor={(c) => c.id}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable onPress={() => router.push('/clips')}>
                  <Image source={{ uri: `https://i.ytimg.com/vi/${item.video_id}/mqdefault.jpg` }} style={st.trendThumb} />
                </Pressable>
              )}
            />
          </>
        )}

        <SectionTitle>Leonida</SectionTitle>
        <Pressable style={st.mapCard} onPress={() => router.push('/map')}>
          <View style={st.chipRow}>
            <Chip label="Collectibles" active />
            <Chip label="Stunt jumps" />
            <Chip label="Businesses" />
          </View>
          <Text style={st.mapStat}>0 / 305 pinned · opens with the game</Text>
          <Text style={st.mapNote}>Every find community-verified before it counts.</Text>
        </Pressable>

        <LinearGradient colors={G.cool} {...GRAD} style={[st.comp, { marginTop: 26 }]}>
          <View style={st.bigReadShade} />
          <Text style={st.proKicker}>SixCentral Pro</Text>
          <Text style={st.compTitle}>Full map. Unlimited tracking. Ad free.</Text>
          <Text style={st.proPrice}>From £14.99 a year · arrives with the game</Text>
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  wrap: { padding: 18, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  brand: { fontSize: 26, fontWeight: '900', letterSpacing: 2 },
  cdChip: { backgroundColor: C.bg2, borderColor: C.line2, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  cdChipText: { color: C.gold, fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: 0.5 },
  bigRead: { borderRadius: 18, padding: 18, minHeight: 170, justifyContent: 'flex-end', overflow: 'hidden' },
  bigReadShade: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,8,16,0.45)' },
  bigKicker: { color: C.cyan, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 },
  bigTitle: { color: '#fff', fontSize: 22, fontWeight: '900', lineHeight: 27, textTransform: 'uppercase' },
  bigSub: { color: 'rgba(255,255,255,0.85)', marginTop: 8, fontSize: 12, fontWeight: '600' },
  latestRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.bg2, borderColor: C.line, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 8 },
  latestText: { color: C.text, fontWeight: '600', flex: 1, marginRight: 10, lineHeight: 19 },
  latestChev: { color: C.pink, fontWeight: '900', fontSize: 16 },
  tip: { borderColor: C.gold, borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 14, backgroundColor: 'rgba(255,200,61,0.06)' },
  tipKicker: { color: C.gold, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  tipText: { color: C.muted, lineHeight: 19, fontSize: 13 },
  comp: { borderRadius: 18, padding: 18, overflow: 'hidden' },
  compTrophy: { fontSize: 26, marginBottom: 6 },
  compTitle: { color: '#fff', fontSize: 18, fontWeight: '900', lineHeight: 23 },
  compBtn: { color: '#fff', marginTop: 10, fontWeight: '800', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  trendThumb: { width: 150, height: 88, borderRadius: 12, marginRight: 10, backgroundColor: C.surface },
  mapCard: { backgroundColor: C.bg2, borderColor: C.line, borderWidth: 1, borderRadius: 18, padding: 16 },
  chipRow: { flexDirection: 'row', marginBottom: 12 },
  mapStat: { color: C.cyan, fontWeight: '800', fontSize: 15 },
  mapNote: { color: C.dim, marginTop: 4, fontSize: 12 },
  proKicker: { color: '#fff', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6, opacity: 0.9 },
  proPrice: { color: 'rgba(255,255,255,0.85)', marginTop: 8, fontSize: 12, fontWeight: '600' },
});
