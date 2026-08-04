import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { C, G, GRAD } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { absUrl } from '@/lib/site';
import { SectionTitle } from '@/components/ui';

type GuideRow = {
  slug: string;
  title: string;
  kicker: string | null;
  excerpt: string | null;
  reading_mins: number | null;
  updated_at: string;
  hero_image: { src: string; alt?: string; credit?: string } | null;
};

const DAY_ONE = [
  { t: 'Story walkthrough', d: 'Spoiler-safe, mission by mission, from the first job.' },
  { t: 'The 100% checklist', d: 'Every tick on one page, synced to your tracker.' },
  { t: 'Collectibles atlas', d: 'All of them, pinned on the community map and confirmed.' },
  { t: 'Money and businesses', d: 'What earns, what burns, and the order that matters.' },
  { t: 'Weapons and loadouts', d: 'Every gun, every mod, what to carry and when.' },
  { t: 'Trophies and platinum', d: 'The road to 100%, missable flags called out early.' },
];

const GTA6_LIVE = [
  {
    t: 'Everything confirmed so far',
    d: 'The verified list: setting, characters, dates, editions. No rumours.',
    slug: 'everything-confirmed',
  },
  {
    t: 'Which edition to pre-order',
    d: 'Standard or Ultimate: what the extra £20 actually buys.',
    slug: 'which-edition-to-preorder',
  },
];

const TOPIC_LABELS: Record<string, string> = {
  'heist guide': 'Heists',
  'business guide': 'Business',
  'weapons guide': 'Weapons',
  'vehicles guide': 'Vehicles',
  'money guide': 'Money',
  'the comparison desk': 'Comparisons',
};

function topicOf(kicker: string | null): string {
  const k = (kicker ?? '').trim().toLowerCase();
  if (TOPIC_LABELS[k]) return TOPIC_LABELS[k];
  if (k.includes('comparison')) return 'Comparisons';
  return (kicker ?? '').trim().replace(/\s*guide$/i, '') || 'Guides';
}

const TOPIC_ORDER: Record<string, number> = { Heists: 0, Business: 1, Money: 2, Weapons: 3, Vehicles: 4, Comparisons: 90 };

export default function Guides() {
  const router = useRouter();
  const [guides, setGuides] = useState<GuideRow[] | null>(null);
  const [topic, setTopic] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('guides')
      .select('slug,title,kicker,excerpt,reading_mins,updated_at,hero_image')
      .eq('published', true)
      .eq('game_slug', 'gta-online')
      .order('updated_at', { ascending: false });
    setGuides((data as GuideRow[] | null) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const topics = (() => {
    const seen = new Set<string>();
    for (const g of guides ?? []) seen.add(topicOf(g.kicker));
    return ['All', ...Array.from(seen).sort((a, b) => (TOPIC_ORDER[a] ?? 50) - (TOPIC_ORDER[b] ?? 50) || a.localeCompare(b))];
  })();
  const shown = (guides ?? []).filter((g) => topic === 'All' || topicOf(g.kicker) === topic);

  return (
    <SafeAreaView style={st.safe}>
      <ScrollView
        contentContainerStyle={st.wrap}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.pink} />}
      >
        <Text style={st.h1}>Guides</Text>
        <Text style={st.sub}>Checked in-game before it is published. No guesswork sold as fact.</Text>

        <Pressable onPress={() => router.push('/collectibles' as Href)} style={st.trackerCard}>
          <Text style={st.trackerTitle}>COLLECTIBLES TRACKER</Text>
          <Text style={st.trackerSub}>All 23 sets, tick off every item, synced to your account</Text>
        </Pressable>
        <SectionTitle>GTA Online · live now</SectionTitle>
        {guides && guides.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.chipsRow} contentContainerStyle={{ gap: 8 }}>
            {topics.map((t) => (
              <Pressable key={t} onPress={() => setTopic(t)} style={[st.filterChip, topic === t && st.filterChipOn]}>
                <Text style={[st.filterChipText, topic === t && st.filterChipTextOn]}>{t}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
        {guides === null ? (
          <Text style={st.note}>Loading the desk…</Text>
        ) : guides.length === 0 ? (
          <Text style={st.note}>
            The online desk could not load. Pull to refresh, or find every guide at sixcentral.co.uk/online.
          </Text>
        ) : (
          shown.map((g) => {
            const heroSrc = absUrl(g.hero_image?.src ?? null);
            return (
              <Pressable
                key={g.slug}
                style={st.card}
                onPress={() => router.push(`/guide/${g.slug}` as Href)}
              >
                {heroSrc ? (
                  <Image source={{ uri: heroSrc }} style={st.thumb} resizeMode="cover" />
                ) : (
                  <LinearGradient colors={G.hot} {...GRAD} style={st.thumb} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={st.cardKicker}>{g.kicker || 'Guide'}</Text>
                  <Text style={st.cardTitle} numberOfLines={2}>
                    {g.title}
                  </Text>
                  <Text style={st.cardMeta}>{g.reading_mins ?? 5} min · step by step</Text>
                </View>
              </Pressable>
            );
          })
        )}

        <SectionTitle>GTA 6 · live now</SectionTitle>
        {GTA6_LIVE.map((g) => (
          <Pressable
            key={g.t}
            style={st.row}
            onPress={() => router.push({ pathname: '/article/[slug]', params: { slug: g.slug } })}
          >
            <View style={{ flex: 1 }}>
              <Text style={st.rowTitle}>{g.t}</Text>
              <Text style={st.rowDesc}>{g.d}</Text>
            </View>
            <View style={[st.chip, st.chipLive]}>
              <Text style={[st.chipText, { color: C.cyan }]}>Live</Text>
            </View>
          </Pressable>
        ))}

        <SectionTitle>GTA 6 · with the game</SectionTitle>
        {DAY_ONE.map((g) => (
          <View key={g.t} style={[st.row, { opacity: 0.75 }]}>
            <View style={{ flex: 1 }}>
              <Text style={st.rowTitle}>{g.t}</Text>
              <Text style={st.rowDesc}>{g.d}</Text>
            </View>
            <View style={[st.chip, st.chipSoon]}>
              <Text style={[st.chipText, { color: C.gold }]}>With the game</Text>
            </View>
          </View>
        ))}

        <Text style={st.note}>
          GTA 6 guides publish the day there is a game to guide: 19 November. GTA Online does not
          wait, and the heist desk above is live today.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  wrap: { padding: 18, paddingBottom: 40 },
  h1: { color: C.text, fontSize: 30, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 },
  sub: { color: C.dim, marginTop: 4, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.bg2, borderColor: C.line, borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 8 },
  thumb: { width: 96, height: 60, borderRadius: 10, backgroundColor: C.surface },
  cardKicker: { color: C.cyan, fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5 },
  cardTitle: { color: C.text, fontWeight: '800', fontSize: 14, marginTop: 2, lineHeight: 18 },
  cardMeta: { color: C.dim, fontSize: 10, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.bg2, borderColor: C.line, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 8 },
  rowTitle: { color: C.text, fontWeight: '800', fontSize: 14 },
  rowDesc: { color: C.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  chipLive: { borderColor: C.cyan, backgroundColor: 'rgba(31,229,214,0.08)' },
  chipSoon: { borderColor: C.gold, backgroundColor: 'rgba(255,200,61,0.08)' },
  chipText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  note: { color: C.dim, lineHeight: 19, fontSize: 12, marginTop: 18 },
  chipsRow: { marginBottom: 12 },
  trackerCard: { borderWidth: 1, borderColor: C.cyan, borderRadius: 14, padding: 13, marginTop: 16, marginBottom: 14, backgroundColor: 'rgba(31,229,214,0.07)' },
  trackerTitle: { color: C.cyan, fontSize: 13, fontWeight: '900', letterSpacing: 0.6 },
  trackerSub: { color: C.muted, fontSize: 11.5, marginTop: 4 },
  filterChip: { borderWidth: 1, borderColor: C.line, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.03)' },
  filterChipOn: { borderColor: C.pink, backgroundColor: 'rgba(255,46,136,0.12)' },
  filterChipText: { color: C.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  filterChipTextOn: { color: C.pink },
});
