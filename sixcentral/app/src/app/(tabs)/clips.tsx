import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Image, Pressable, Share, StyleSheet, Text, View, type ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';

type Clip = {
  id: string;
  video_id: string;
  caption: string | null;
  votes: number;
  comp_entry: boolean;
  profiles: { handle: string; title: string | null; rank_id: number } | null;
};
type Rank = { id: number; name: string };

export default function Clips() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pageH, setPageH] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [myVotes, setMyVotes] = useState<Record<string, number>>({});
  const [deltas, setDeltas] = useState<Record<string, number>>({});
  const [hint, setHint] = useState('');
  const router = useRouter();

  useEffect(() => {
    supabase.from('ranks').select('id, name').order('id').then(({ data }) => {
      if (data) setRanks(data as Rank[]);
    });
    supabase
      .from('clip_submissions')
      .select('id, video_id, caption, votes, comp_entry, profiles!clip_submissions_profile_id_fkey(handle, title, rank_id)')
      .eq('status', 'approved')
      .gt('votes', -3)
      .order('votes', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setClips(data as unknown as Clip[]);
        setLoaded(true);
      });
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || clips.length === 0) return;
    supabase
      .from('clip_votes')
      .select('clip_id, value')
      .in('clip_id', clips.map((c) => c.id))
      .then(({ data }) => {
        if (data) {
          const m: Record<string, number> = {};
          for (const row of data as { clip_id: string; value: number }[]) m[row.clip_id] = row.value;
          setMyVotes(m);
        }
      });
  }, [session, clips]);

  // leaving a page stops its player
  useEffect(() => {
    setPlayingId((p) => (p && p !== activeId ? null : p));
  }, [activeId]);

  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find((v) => v.isViewable);
    if (first?.item) setActiveId((first.item as Clip).id);
  });

  const rankName = useCallback((id: number) => ranks.find((r) => r.id === id)?.name ?? '', [ranks]);

  function nudge(text: string) {
    setHint(text);
    setTimeout(() => setHint(''), 2500);
  }

  async function vote(clip: Clip) {
    if (!session) return nudge('Sign in on the Profile tab to vote');
    const me = session.user.id;
    const cur = myVotes[clip.id];
    if (cur === 1) {
      setMyVotes((m) => { const n = { ...m }; delete n[clip.id]; return n; });
      setDeltas((d) => ({ ...d, [clip.id]: (d[clip.id] ?? 0) - 1 }));
      await supabase.from('clip_votes').delete().eq('clip_id', clip.id).eq('profile_id', me);
    } else {
      setMyVotes((m) => ({ ...m, [clip.id]: 1 }));
      setDeltas((d) => ({ ...d, [clip.id]: (d[clip.id] ?? 0) + (cur === -1 ? 2 : 1) }));
      await supabase.from('clip_votes').upsert({ clip_id: clip.id, profile_id: me, value: 1 });
    }
  }

  if (loaded && clips.length === 0) {
    return (
      <SafeAreaView style={st.safe}>
        <View style={{ padding: 20 }}>
          <Text style={st.h1}>Clips</Text>
          <Text style={st.muted}>
            The feed opens with the game. First featured clip in SixCentral history is up for
            grabs on launch night.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <View style={{ flex: 1 }} onLayout={(e) => setPageH(e.nativeEvent.layout.height)}>
        {pageH > 0 && (
          <FlatList
            data={clips}
            keyExtractor={(c) => c.id}
            showsVerticalScrollIndicator={false}
            snapToInterval={pageH}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            getItemLayout={(_, i) => ({ length: pageH, offset: pageH * i, index: i })}
            onViewableItemsChanged={onViewable.current}
            viewabilityConfig={{ itemVisiblePercentThreshold: 75 }}
            renderItem={({ item }) => {
              const p = item.profiles;
              const playing = playingId === item.id;
              return (
                <View style={{ height: pageH }}>
                  {playing ? (
                    <WebView
                      style={StyleSheet.absoluteFill}
                      source={{
                        uri: `https://www.youtube-nocookie.com/embed/${item.video_id}?autoplay=1&playsinline=1&rel=0&modestbranding=1`,
                      }}
                      allowsInlineMediaPlayback
                      mediaPlaybackRequiresUserAction={false}
                      allowsFullscreenVideo
                    />
                  ) : (
                    <>
                      <Image
                        source={{ uri: `https://i.ytimg.com/vi/${item.video_id}/hqdefault.jpg` }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                      />
                      <LinearGradient colors={['rgba(11,8,16,0.35)', 'transparent', 'rgba(11,8,16,0.95)']} style={StyleSheet.absoluteFill} />
                      <Pressable style={st.playHit} onPress={() => setPlayingId(item.id)}>
                        <View style={st.play}>
                          <Text style={st.playText}>▶</Text>
                        </View>
                      </Pressable>
                    </>
                  )}

                  <Text style={st.feedTag}>CLIPS · swipe up</Text>
                  {hint ? <Text style={st.hint}>{hint}</Text> : null}

                  <View style={st.rail} pointerEvents="box-none">
                    <Pressable style={st.railBtn} onPress={() => vote(item)}>
                      <Text style={[st.railIcon, myVotes[item.id] === 1 && { color: C.pink }]}>▲</Text>
                      <Text style={[st.railCount, myVotes[item.id] === 1 && { color: C.pink }]}>
                        {item.votes + (deltas[item.id] ?? 0)}
                      </Text>
                    </Pressable>
                    <View style={st.railBtn}>
                      <Text style={st.railIcon}>💬</Text>
                      <Text style={st.railCount}>—</Text>
                    </View>
                    <Pressable
                      style={st.railBtn}
                      onPress={() => Share.share({ message: `https://www.youtube.com/watch?v=${item.video_id}` })}
                    >
                      <Text style={st.railIcon}>↗</Text>
                      <Text style={st.railCount}>Share</Text>
                    </Pressable>
                  </View>

                  {!playing && (
                    <View style={st.info} pointerEvents="box-none">
                      {item.comp_entry && (
                        <View style={st.compTag}>
                          <Text style={st.compTagText}>🏆 Clip of the Month entry</Text>
                        </View>
                      )}
                      <Pressable
                        style={st.creator}
                        onPress={() => p && router.push({ pathname: '/u/[handle]', params: { handle: p.handle } })}
                      >
                        <View style={st.av}>
                          <Text style={st.avText}>{p?.handle?.slice(0, 2).toUpperCase() ?? '??'}</Text>
                        </View>
                        <View>
                          <Text style={st.cn}>@{p?.handle ?? 'unknown'}</Text>
                          <Text style={st.cr}>{p ? (p.title ?? rankName(p.rank_id)) : ''}</Text>
                        </View>
                      </Pressable>
                      {item.caption ? (
                        <Text style={st.cap} numberOfLines={2}>
                          {item.caption}
                        </Text>
                      ) : null}
                      <Text style={st.snd}>♪ original audio · gameplay clip</Text>
                    </View>
                  )}
                </View>
              );
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  h1: { color: C.text, fontSize: 30, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 },
  muted: { color: C.muted, lineHeight: 20 },
  feedTag: { position: 'absolute', top: 14, left: 16, color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  hint: { position: 'absolute', top: 40, left: 16, right: 16, color: C.gold, fontSize: 12, fontWeight: '700' },
  playHit: { ...StyleSheet.absoluteFillObject as object, alignItems: 'center', justifyContent: 'center' },
  play: { width: 62, height: 62, borderRadius: 31, backgroundColor: 'rgba(11,8,16,0.55)', alignItems: 'center', justifyContent: 'center', borderColor: 'rgba(255,255,255,0.4)', borderWidth: 1 },
  playText: { color: '#fff', fontSize: 20, marginLeft: 3 },
  rail: { position: 'absolute', right: 12, bottom: 110, alignItems: 'center', gap: 18 },
  railBtn: { alignItems: 'center' },
  railIcon: { fontSize: 22, color: '#fff' },
  railCount: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700', marginTop: 2 },
  info: { position: 'absolute', left: 16, right: 70, bottom: 24 },
  compTag: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,200,61,0.18)', borderColor: C.gold, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  compTagText: { color: C.gold, fontSize: 10, fontWeight: '800' },
  creator: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  av: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface, borderColor: C.pink, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  avText: { color: C.pink, fontWeight: '900', fontSize: 12 },
  cn: { color: '#fff', fontWeight: '800', fontSize: 14 },
  cr: { color: C.gold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  cap: { color: 'rgba(255,255,255,0.92)', fontSize: 13, lineHeight: 18 },
  snd: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 5 },
});
