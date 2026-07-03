import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Image, Modal, Pressable, RefreshControl, Share, StyleSheet, Text, View, type ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { flairColor } from '@/lib/flairs';
import { blockUser, fetchBlockedIds, reportClip } from '@/lib/blocks';
import Avatar from '@/components/Avatar';
import { C } from '@/lib/theme';

type Clip = {
  id: string;
  profile_id: string;
  video_id: string;
  caption: string | null;
  votes: number;
  comp_entry: boolean;
  profiles: { handle: string; title: string | null; rank_id: number; avatar_url: string | null; flair: string | null } | null;
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
  const [reacts, setReacts] = useState<Record<string, Record<string, number>>>({});
  const [myReacts, setMyReacts] = useState<Record<string, Set<string>>>({});
  const [friends, setFriends] = useState<{ id: string; handle: string }[]>([]);
  const [shareClip, setShareClip] = useState<Clip | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    if (!session) return;
    fetchBlockedIds().then(setBlocked);
  }, [session]);

  const EMOJI: [string, string][] = [['fire', '🔥'], ['funny', '😂'], ['mind', '🤯'], ['trophy', '🏆']];

  function needSignIn() {
    Alert.alert('Sign in first', 'Reporting and blocking need an account so mods can act on it.');
  }

  async function sendReport(clip: Clip, reason: 'not_gta' | 'offensive' | 'spam' | 'other') {
    const { error } = await reportClip(clip.id, reason);
    Alert.alert(
      error ? 'That did not go through' : 'Reported',
      error ? 'Try again in a minute.' : 'Mods review fast and pull anything that breaks the rules.'
    );
  }

  function reportMenu(clip: Clip) {
    if (!session) return needSignIn();
    Alert.alert('Report this clip', 'Tell the mods what is wrong.', [
      { text: 'Not GTA', onPress: () => sendReport(clip, 'not_gta') },
      { text: 'Offensive or abusive', onPress: () => sendReport(clip, 'offensive') },
      { text: 'Spam or misleading', onPress: () => sendReport(clip, 'spam') },
      { text: 'Something else', onPress: () => sendReport(clip, 'other') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function confirmBlock(clip: Clip) {
    if (!session) return needSignIn();
    const handle = clip.profiles?.handle ?? 'this user';
    Alert.alert(`Block @${handle}?`, 'Their clips vanish from your feed and neither of you can send friend requests or shares. Unblock any time from their profile.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          const { error } = await blockUser(clip.profile_id);
          if (!error) setBlocked((b) => new Set([...b, clip.profile_id]));
        },
      },
    ]);
  }

  function modMenu(clip: Clip) {
    const handle = clip.profiles?.handle ?? 'user';
    Alert.alert('Clip options', undefined, [
      { text: 'Report this clip', onPress: () => reportMenu(clip) },
      { text: `Block @${handle}`, style: 'destructive', onPress: () => confirmBlock(clip) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  const visible = clips.filter((c) => !blocked.has(c.profile_id));

  const loadFeed = useCallback(() => {
    supabase.from('ranks').select('id, name').order('id').then(({ data }) => {
      if (data) setRanks(data as Rank[]);
    });
    return supabase
      .from('clip_submissions')
      .select('id, profile_id, video_id, caption, votes, comp_entry, profiles!clip_submissions_profile_id_fkey(handle, title, rank_id, avatar_url, flair)')
      .eq('status', 'approved')
      .gt('votes', -3)
      .order('votes', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setClips(data as unknown as Clip[]);
        setLoaded(true);
      });
  }, []);

  useEffect(() => {
    loadFeed();
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (clips.length === 0) return;
    supabase
      .from('clip_reactions')
      .select('clip_id, emoji, profile_id')
      .in('clip_id', clips.map((c) => c.id))
      .then(({ data }) => {
        if (!data) return;
        const counts: Record<string, Record<string, number>> = {};
        const mine: Record<string, Set<string>> = {};
        for (const r of data as { clip_id: string; emoji: string; profile_id: string }[]) {
          counts[r.clip_id] = counts[r.clip_id] ?? {};
          counts[r.clip_id][r.emoji] = (counts[r.clip_id][r.emoji] ?? 0) + 1;
          if (session && r.profile_id === session.user.id) {
            mine[r.clip_id] = mine[r.clip_id] ?? new Set();
            mine[r.clip_id].add(r.emoji);
          }
        }
        setReacts(counts);
        setMyReacts(mine);
      });
  }, [clips, session]);

  useEffect(() => {
    if (!session) return;
    const me = session.user.id;
    supabase
      .from('friendships')
      .select('requester, addressee, req:profiles!friendships_requester_fkey(id, handle), add:profiles!friendships_addressee_fkey(id, handle)')
      .eq('status', 'accepted')
      .then(({ data }) => {
        if (!data) return;
        const list = (data as unknown as { requester: string; req: { id: string; handle: string }; add: { id: string; handle: string } }[])
          .map((f) => (f.requester === me ? f.add : f.req))
          .filter(Boolean);
        setFriends(list);
      });
  }, [session]);

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

  async function react(clip: Clip, key: string) {
    if (!session) return nudge('Sign in on the Profile tab to react');
    const me = session.user.id;
    const mine = myReacts[clip.id]?.has(key);
    setMyReacts((m) => {
      const n = { ...m };
      const s = new Set(n[clip.id] ?? []);
      if (mine) s.delete(key); else s.add(key);
      n[clip.id] = s;
      return n;
    });
    setReacts((r) => {
      const n = { ...r, [clip.id]: { ...(r[clip.id] ?? {}) } };
      n[clip.id][key] = Math.max(0, (n[clip.id][key] ?? 0) + (mine ? -1 : 1));
      return n;
    });
    if (mine) {
      await supabase.from('clip_reactions').delete().eq('clip_id', clip.id).eq('profile_id', me).eq('emoji', key);
    } else {
      await supabase.from('clip_reactions').insert({ clip_id: clip.id, profile_id: me, emoji: key });
    }
  }

  async function sendToFriend(friend: { id: string; handle: string }) {
    if (!session || !shareClip) return;
    const { error } = await supabase
      .from('clip_shares')
      .insert({ clip_id: shareClip.id, from_profile: session.user.id, to_profile: friend.id });
    setShareClip(null);
    nudge(error ? 'Already sent to them.' : `Sent to @${friend.handle} ✓`);
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  }, [loadFeed]);

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
            data={visible}
            keyExtractor={(c) => c.id}
            showsVerticalScrollIndicator={false}
            snapToInterval={pageH}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            getItemLayout={(_, i) => ({ length: pageH, offset: pageH * i, index: i })}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.pink} />}
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
                    <Pressable
                      style={st.railBtn}
                      onPress={() => {
                        setHint('Comments land with the game this November.');
                        setTimeout(() => setHint(''), 2200);
                      }}
                    >
                      <Text style={st.railIcon}>💬</Text>
                      <Text style={st.railCount}>Soon</Text>
                    </Pressable>
                    <Pressable style={st.railBtn} onPress={() => setShareClip(item)}>
                      <Text style={st.railIcon}>↗</Text>
                      <Text style={st.railCount}>Share</Text>
                    </Pressable>
                    <Pressable style={st.railBtn} onPress={() => modMenu(item)}>
                      <Text style={st.railIcon}>⚑</Text>
                      <Text style={st.railCount}>Report</Text>
                    </Pressable>
                  </View>

                  {!playing && (
                    <View style={st.info} pointerEvents="box-none">
                      <View style={st.reactRow}>
                        {EMOJI.map(([key, glyph]) => {
                          const n = reacts[item.id]?.[key] ?? 0;
                          const mine = myReacts[item.id]?.has(key);
                          return (
                            <Pressable key={key} style={[st.reactChip, mine && st.reactChipOn]} onPress={() => react(item, key)}>
                              <Text style={st.reactGlyph}>{glyph}</Text>
                              {n > 0 && <Text style={[st.reactCount, mine && { color: '#fff' }]}>{n}</Text>}
                            </Pressable>
                          );
                        })}
                      </View>
                      {item.comp_entry && (
                        <View style={st.compTag}>
                          <Text style={st.compTagText}>🏆 Clip of the Month entry</Text>
                        </View>
                      )}
                      <Pressable
                        style={st.creator}
                        onPress={() => p && router.push({ pathname: '/u/[handle]', params: { handle: p.handle } })}
                      >
                        <Avatar url={p?.avatar_url} handle={p?.handle} size={38} ring={flairColor(p?.flair)} />
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
        <Pressable style={st.submitPill} onPress={() => router.push('/submit')}>
          <Text style={st.submitPillText}>+ Submit</Text>
        </Pressable>

        <Modal visible={!!shareClip} transparent animationType="slide" onRequestClose={() => setShareClip(null)}>
          <Pressable style={st.modalBack} onPress={() => setShareClip(null)}>
            <Pressable style={st.sheet} onPress={() => {}}>
              <Text style={st.sheetTitle}>Share this clip</Text>
              <Pressable
                style={st.sheetRow}
                onPress={() => {
                  const url = `https://www.youtube.com/watch?v=${shareClip?.video_id}`;
                  setShareClip(null);
                  Share.share({ message: url });
                }}
              >
                <Text style={st.sheetRowText}>↗ Share the link…</Text>
              </Pressable>
              {friends.length > 0 && <Text style={st.sheetKicker}>Send to a friend</Text>}
              {friends.map((f) => (
                <Pressable key={f.id} style={st.sheetRow} onPress={() => sendToFriend(f)}>
                  <Text style={st.sheetRowText}>📩 @{f.handle}</Text>
                </Pressable>
              ))}
              {session && friends.length === 0 && (
                <Text style={st.sheetHint}>Add friends from any profile and they show up here.</Text>
              )}
            </Pressable>
          </Pressable>
        </Modal>
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
  reactRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  reactChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(11,8,16,0.55)', borderColor: 'rgba(255,255,255,0.25)', borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  reactChipOn: { backgroundColor: 'rgba(255,46,136,0.45)', borderColor: C.pink },
  reactGlyph: { fontSize: 14 },
  reactCount: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '800' },
  submitPill: { position: 'absolute', top: 10, right: 14, backgroundColor: C.pink, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, shadowColor: C.pink, shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 5 },
  submitPillText: { color: '#fff', fontWeight: '900', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.bg2, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 34, borderColor: C.line2, borderWidth: 1 },
  sheetTitle: { color: C.text, fontWeight: '900', fontSize: 16, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  sheetKicker: { color: C.dim, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 12, marginBottom: 4 },
  sheetRow: { paddingVertical: 12, borderBottomColor: C.line, borderBottomWidth: 1 },
  sheetRowText: { color: C.text, fontWeight: '700', fontSize: 14 },
  sheetHint: { color: C.dim, fontSize: 12, marginTop: 10, lineHeight: 17 },
});
