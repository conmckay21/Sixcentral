import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useCallback } from 'react';
import { AccessibilityInfo, FlatList, Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { fetchBlockedIds } from '@/lib/blocks';
import { supabase } from '@/lib/supabase';
import { voteBus } from '@/lib/voteBus';
import { C, G, GRAD } from '@/lib/theme';
import { Chip, SectionTitle } from '@/components/ui';

const LAUNCH = new Date('2026-11-19T00:00:00Z').getTime();
const SITE = 'https://sixcentral.co.uk';

type Clip = { id: string; video_id: string; profile_id: string };
type ContentItem = {
  category?: string;
  upCount?: number;
  downCount?: number;
  slug: string;
  title: string;
  kicker: string;
  excerpt: string;
  isRumour?: boolean;
  credibility?: number;
  heroImage?: { src: string } | null;
};
type ShareRow = {
  id: string;
  clip: { video_id: string; caption: string | null } | null;
  from_p: { id: string; handle: string } | null;
};

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

const RAIL_STEP = 242; // card 230 + 12 gap, matches snapToInterval

/**
 * Auto-advances a horizontal FlatList one card per tick and wraps.
 * Touching the rail buys an 8s grace period instead of an instant resume, the
 * index resyncs to wherever the user left it, and it all switches off for
 * Reduce Motion or when the screen loses focus.
 */
function useAutoRail(count: number, focused: boolean) {
  const ref = useRef<FlatList>(null);
  const idx = useRef(0);
  const pausedUntil = useRef(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!focused || reduceMotion || count < 2) return;
    const id = setInterval(() => {
      if (Date.now() < pausedUntil.current) return;
      idx.current = (idx.current + 1) % count;
      ref.current?.scrollToOffset({ offset: idx.current * RAIL_STEP, animated: true });
    }, 5000);
    return () => clearInterval(id);
  }, [focused, reduceMotion, count]);

  const onTouch = () => {
    pausedUntil.current = Date.now() + 8000;
  };
  const onSettle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    pausedUntil.current = Date.now() + 8000;
    idx.current = Math.max(0, Math.round(e.nativeEvent.contentOffset.x / RAIL_STEP));
  };
  return { ref, onTouch, onSettle };
}

export default function Home() {
  const { d, h, m } = useCountdown();
  const router = useRouter();
  const [clips, setClips] = useState<Clip[]>([]);
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [feed, setFeed] = useState<ContentItem[]>([]);
  const [rumours, setRumours] = useState<ContentItem[]>([]);
  const [rapSheet, setRapSheet] = useState<ContentItem[]>([]);
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );
  const newsRail = useAutoRail(Math.min(Math.max(feed.length - 1, 0), 8), focused);
  const rumourRail = useAutoRail(Math.min(rumours.length, 8), focused);
  const rapRail = useAutoRail(Math.min(rapSheet.length, 8), focused);
  const [blocked, setBlocked] = useState<Set<string>>(new Set());

  useEffect(() => {
    return voteBus.on((slug, c) => {
      const apply = (arr: ContentItem[]) =>
        arr.map((a) => (a.slug === slug ? { ...a, upCount: c.up, downCount: c.down } : a));
      setFeed((prev) => apply(prev));
      setRumours((prev) => apply(prev));
      setRapSheet((prev) => apply(prev));
    });
  }, []);

  const loadContent = useCallback(() => {
    return fetch(`${SITE}/api/content`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: { articles: ContentItem[] }) => {
        setFeed(j.articles.filter((a) => !a.isRumour && a.category !== 'controversy'));
        setRumours(j.articles.filter((a) => a.isRumour));
        setRapSheet(j.articles.filter((a) => a.category === 'controversy'));
      })
      .catch(() => {});
  }, []);

  const loadClips = useCallback(() => {
    return supabase
      .from('clip_submissions')
      .select('id, video_id, profile_id')
      .eq('status', 'approved')
      .gt('votes', -3)
      .order('votes', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (data) setClips(data as Clip[]);
      });
  }, []);

  const loadShares = useCallback((s: Session | null) => {
    if (!s) return Promise.resolve();
    return supabase
      .from('clip_shares')
      .select('id, clip:clip_submissions!clip_shares_clip_id_fkey(video_id, caption), from_p:profiles!clip_shares_from_profile_fkey(id, handle)')
      .eq('to_profile', s.user.id)
      .is('seen_at', null)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (data) setShares(data as unknown as ShareRow[]);
      });
  }, []);

  useEffect(() => {
    loadContent();
    loadClips();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadShares(data.session);
      if (data.session) fetchBlockedIds().then(setBlocked);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      loadShares(s);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadClips, loadShares, loadContent]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadClips(), loadShares(session), loadContent()]);
    setRefreshing(false);
  }, [loadClips, loadShares, loadContent, session]);

  return (
    <SafeAreaView style={st.safe}>
      <ScrollView contentContainerStyle={st.wrap} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.pink} />}>
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

        {shares.length > 0 && (
          <>
            <SectionTitle>Shared with you</SectionTitle>
            <FlatList
              horizontal
              data={shares.filter((s) => !s.from_p || !blocked.has(s.from_p.id))}
              keyExtractor={(s) => s.id}
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16 }}
              renderItem={({ item }) => (
                <Pressable
                  style={st.shareCard}
                  onPress={async () => {
                    await supabase.from('clip_shares').update({ seen_at: new Date().toISOString() }).eq('id', item.id);
                    setShares((s) => s.filter((x) => x.id !== item.id));
                    router.push('/clips');
                  }}
                >
                  <Image source={{ uri: `https://i.ytimg.com/vi/${item.clip?.video_id}/mqdefault.jpg` }} style={st.shareThumb} />
                  <Text style={st.shareFrom}>@{item.from_p?.handle ?? '?'} sent this</Text>
                  <Pressable
                    style={st.shareX}
                    hitSlop={8}
                    onPress={async () => {
                      await supabase.from('clip_shares').delete().eq('id', item.id);
                      setShares((s) => s.filter((x) => x.id !== item.id));
                    }}
                  >
                    <Text style={st.shareXText}>✕</Text>
                  </Pressable>
                </Pressable>
              )}
            />
          </>
        )}

        <Pressable
          onPress={() =>
            router.push({ pathname: '/article/[slug]', params: { slug: feed[0]?.slug ?? 'everything-confirmed' } })
          }
        >
          {feed[0]?.heroImage ? (
            <View style={st.bigRead}>
              <Image source={{ uri: feed[0].heroImage.src }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} resizeMode="cover" />
              <View style={st.bigReadShade} />
              <Text style={st.bigKicker}>The big read · {feed[0].kicker}</Text>
              <Text style={st.bigTitle}>{feed[0].title}</Text>
              <Text style={st.bigSub}>
                Read in the app →
                {`   👍 ${feed[0].upCount ?? 0} · 👎 ${feed[0].downCount ?? 0}`}
              </Text>
            </View>
          ) : (
            <LinearGradient colors={G.hot} {...GRAD} style={st.bigRead}>
              <View style={st.bigReadShade} />
              <Text style={st.bigKicker}>The big read · verified</Text>
              <Text style={st.bigTitle}>{feed[0]?.title ?? 'Everything confirmed about GTA 6, in one place'}</Text>
              <Text style={st.bigSub}>Read in the app →</Text>
            </LinearGradient>
          )}
        </Pressable>

        <SectionTitle>Latest</SectionTitle>
        <FlatList
          horizontal
          data={feed.slice(1, 9)}
          keyExtractor={(a) => a.slug}
          showsHorizontalScrollIndicator={false}
          snapToInterval={242}
          decelerationRate="fast"
          style={st.newsRail}
          ref={newsRail.ref}
          onScrollBeginDrag={newsRail.onTouch}
          onScrollEndDrag={newsRail.onSettle}
          onMomentumScrollEnd={newsRail.onSettle}
          renderItem={({ item }) => (
            <Pressable
              style={st.newsCard}
              onPress={() => router.push({ pathname: '/article/[slug]', params: { slug: item.slug } })}
            >
              {item.heroImage ? (
                <Image source={{ uri: item.heroImage.src }} style={st.newsThumb} resizeMode="cover" />
              ) : (
                <LinearGradient colors={G.hot} {...GRAD} style={st.newsThumb} />
              )}
              <Text style={st.newsKicker}>{item.kicker}</Text>
              <Text style={st.newsTitle} numberOfLines={2}>
                {item.title}
              </Text>
                  <Text style={st.reactMeta}>👍 {item.upCount ?? 0} · 👎 {item.downCount ?? 0}</Text>
            </Pressable>
          )}
        />
        {feed.length <= 1 && (
          <Pressable style={st.latestRow} onPress={() => router.push('/guides')}>
            <Text style={st.latestText}>The guides desk: A to Z, the moment there is a game to guide</Text>
            <Text style={st.latestChev}>→</Text>
          </Pressable>
        )}

        {rumours.length > 0 && (
          <>
            <SectionTitle right={<Text style={st.railNote}>Unconfirmed by design</Text>}>Rumour Mill</SectionTitle>
            <FlatList
              horizontal
              data={rumours.slice(0, 8)}
              keyExtractor={(a) => a.slug}
              showsHorizontalScrollIndicator={false}
              snapToInterval={242}
              decelerationRate="fast"
              style={st.newsRail}
              ref={rumourRail.ref}
              onScrollBeginDrag={rumourRail.onTouch}
              onScrollEndDrag={rumourRail.onSettle}
              onMomentumScrollEnd={rumourRail.onSettle}
              renderItem={({ item }) => (
                <Pressable
                  style={st.newsCard}
                  onPress={() => router.push({ pathname: '/article/[slug]', params: { slug: item.slug } })}
                >
                  {item.heroImage ? (
                    <Image source={{ uri: item.heroImage.src }} style={[st.newsThumb, st.rumourThumb]} resizeMode="cover" />
                  ) : (
                    <LinearGradient colors={G.cool} {...GRAD} style={[st.newsThumb, st.rumourThumb]} />
                  )}
                  <Text style={st.rumourChipText}>Rumour · Heat {item.credibility ?? 2}/5</Text>
                  <Text style={st.newsTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={st.reactMeta}>👍 {item.upCount ?? 0} · 👎 {item.downCount ?? 0}</Text>
                </Pressable>
              )}
            />
          </>
        )}

        {rapSheet.length > 0 && (
          <>
            <SectionTitle right={<Text style={st.railNote}>Every offence on the record</Text>}>The Rap Sheet</SectionTitle>
            <FlatList
              horizontal
              data={rapSheet.slice(0, 8)}
              keyExtractor={(a) => a.slug}
              showsHorizontalScrollIndicator={false}
              snapToInterval={242}
              decelerationRate="fast"
              style={st.newsRail}
              ref={rapRail.ref}
              onScrollBeginDrag={rapRail.onTouch}
              onScrollEndDrag={rapRail.onSettle}
              onMomentumScrollEnd={rapRail.onSettle}
              renderItem={({ item }) => (
                <Pressable
                  style={st.newsCard}
                  onPress={() => router.push({ pathname: '/article/[slug]', params: { slug: item.slug } })}
                >
                  {item.heroImage ? (
                    <Image source={{ uri: item.heroImage.src }} style={[st.newsThumb, st.rumourThumb]} resizeMode="cover" />
                  ) : (
                    <LinearGradient colors={G.cool} {...GRAD} style={[st.newsThumb, st.rumourThumb]} />
                  )}
                  <Text style={st.rumourChipText}>Controversy · On the record</Text>
                  <Text style={st.newsTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={st.reactMeta}>👍 {item.upCount ?? 0} · 👎 {item.downCount ?? 0}</Text>
                </Pressable>
              )}
            />
          </>
        )}

        <Pressable style={st.tip} onPress={() => router.push({ pathname: '/article/[slug]', params: { slug: 'which-edition-to-preorder' } })}>
          <Text style={st.tipKicker}>Tip · pre-orders</Text>
          <Text style={st.tipText}>
            Standard £69.99, Ultimate £89.99. Tap for the edition breakdown before launch night.
          </Text>
        </Pressable>

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
              data={clips.filter((c) => !blocked.has(c.profile_id))}
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
          <Text style={st.proPrice}>Landing with the game this November.</Text>
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  reactMeta: { color: C.dim, fontSize: 11, marginTop: 4 },
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
  newsRail: { marginBottom: 4 },
  newsCard: { width: 230, marginRight: 12 },
  newsThumb: { width: 230, height: 130, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  rumourThumb: { borderColor: 'rgba(255,200,61,0.35)' },
  newsKicker: { color: C.cyan, fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 8 },
  rumourChipText: { color: C.gold, fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 8 },
  newsTitle: { color: C.text, fontWeight: '700', fontSize: 13.5, lineHeight: 18, marginTop: 3 },
  railNote: { color: C.dim, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  shareCard: { width: 150, marginRight: 10 },
  shareThumb: { width: 150, height: 88, borderRadius: 12, backgroundColor: C.surface },
  shareFrom: { color: C.muted, fontSize: 11, marginTop: 5, fontWeight: '600' },
  shareX: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(11,8,16,0.7)', borderRadius: 999, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  shareXText: { color: '#fff', fontSize: 11, fontWeight: '900' },
});
