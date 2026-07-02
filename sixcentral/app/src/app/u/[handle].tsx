import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';
import { flairColor } from '@/lib/flairs';
import Avatar from '@/components/Avatar';
import { SectionTitle } from '@/components/ui';

type P = {
  id: string;
  handle: string;
  title: string | null;
  avatar_url: string | null;
  respect: number;
  rank_id: number;
  is_staff: boolean;
  is_pro: boolean;
  flair: string | null;
  bio: string | null;
  platform: string | null;
  psn_id: string | null;
  xbox_gamertag: string | null;
};
type Clip = { id: string; video_id: string; votes: number };
type FriendState = 'none' | 'out' | 'in' | 'friends';

export default function MemberProfile() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [p, setP] = useState<P | null>(null);
  const [rankName, setRankName] = useState('');
  const [clips, setClips] = useState<Clip[]>([]);
  const [fState, setFState] = useState<FriendState>('none');
  const [fId, setFId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
  }, []);

  useEffect(() => {
    if (!handle) return;
    supabase
      .from('public_profiles')
      .select('id, handle, title, avatar_url, respect, rank_id, is_staff, is_pro, flair, bio, platform, psn_id, xbox_gamertag')
      .ilike('handle', handle)
      .maybeSingle()
      .then(async ({ data }) => {
        setLoaded(true);
        if (!data) return;
        const prof = data as P;
        setP(prof);
        const { data: r } = await supabase.from('ranks').select('name').eq('id', prof.rank_id).single();
        if (r) setRankName((r as { name: string }).name);
        const { data: cl } = await supabase
          .from('clip_submissions')
          .select('id, video_id, votes')
          .eq('status', 'approved')
          .eq('profile_id', prof.id)
          .order('votes', { ascending: false })
          .limit(4);
        if (cl) setClips(cl as Clip[]);
      });
  }, [handle]);

  useEffect(() => {
    if (!session || !p || session.user.id === p.id) return;
    const me = session.user.id;
    supabase
      .from('friendships')
      .select('id, status, requester, addressee')
      .or(`and(requester.eq.${me},addressee.eq.${p.id}),and(requester.eq.${p.id},addressee.eq.${me})`)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return setFState('none');
        setFId(data.id as string);
        if (data.status === 'accepted') return setFState('friends');
        setFState(data.requester === me ? 'out' : 'in');
      });
  }, [session, p]);

  async function friendAction(action: 'add' | 'cancel' | 'accept' | 'decline' | 'remove') {
    if (!session || !p) return;
    const me = session.user.id;
    if (action === 'add') {
      const { data } = await supabase
        .from('friendships')
        .insert({ requester: me, addressee: p.id })
        .select('id')
        .single();
      if (data) {
        setFId(data.id as string);
        setFState('out');
      }
    } else if (action === 'accept' && fId) {
      await supabase.from('friendships').update({ status: 'accepted' }).eq('id', fId);
      setFState('friends');
    } else if (fId) {
      await supabase.from('friendships').delete().eq('id', fId);
      setFId(null);
      setFState('none');
    }
  }

  if (!loaded) {
    return (
      <SafeAreaView style={st.safe}>
        <ActivityIndicator color={C.pink} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (!p) {
    return (
      <SafeAreaView style={st.safe}>
        <View style={{ padding: 20 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={st.back}>← Back</Text>
          </Pressable>
          <Text style={st.muted}>No one goes by that handle.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isMe = session?.user.id === p.id;
  const ring = flairColor(p.flair);

  return (
    <SafeAreaView style={st.safe}>
      <ScrollView contentContainerStyle={st.wrap} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()}>
          <Text style={st.back}>← Back</Text>
        </Pressable>

        <View style={st.head}>
          <Avatar url={p.avatar_url} handle={p.handle} size={68} ring={ring} />
          <View style={{ flex: 1 }}>
            <Text style={st.handle}>@{p.handle}</Text>
            <Text style={st.rank}>
              {p.title ? p.title : ''}
              {p.title && (rankName || p.is_staff) ? ' · ' : ''}
              {p.is_staff ? 'Above the ladder' : rankName}
            </Text>
          </View>
          {p.is_pro && (
            <View style={st.proBadge}>
              <Text style={st.proBadgeText}>PRO</Text>
            </View>
          )}
        </View>

        {p.bio ? <Text style={st.bio}>{p.bio}</Text> : null}

        <View style={st.metaRow}>
          {p.platform && (
            <View style={st.metaChip}>
              <Text style={st.metaChipText}>{p.platform === 'ps5' ? 'PS5' : 'Xbox'}</Text>
            </View>
          )}
          {p.psn_id && <Text style={st.metaId}>PSN · {p.psn_id}</Text>}
          {p.xbox_gamertag && <Text style={st.metaId}>Xbox · {p.xbox_gamertag}</Text>}
        </View>

        {!p.is_staff && (
          <View style={st.statCard}>
            <Text style={st.statNum}>{p.respect.toLocaleString('en-GB')}</Text>
            <Text style={st.statLbl}>Respect</Text>
          </View>
        )}

        {!isMe && session && (
          <View style={st.friendRow}>
            {fState === 'none' && (
              <Pressable style={st.btn} onPress={() => friendAction('add')}>
                <Text style={st.btnText}>Add friend</Text>
              </Pressable>
            )}
            {fState === 'out' && (
              <Pressable style={st.btnGhost} onPress={() => friendAction('cancel')}>
                <Text style={st.btnGhostText}>Requested · tap to cancel</Text>
              </Pressable>
            )}
            {fState === 'in' && (
              <>
                <Pressable style={[st.btn, { flex: 1 }]} onPress={() => friendAction('accept')}>
                  <Text style={st.btnText}>Accept</Text>
                </Pressable>
                <Pressable style={[st.btnGhost, { flex: 1 }]} onPress={() => friendAction('decline')}>
                  <Text style={st.btnGhostText}>Decline</Text>
                </Pressable>
              </>
            )}
            {fState === 'friends' && (
              <Pressable style={st.btnGhost} onPress={() => friendAction('remove')}>
                <Text style={[st.btnGhostText, { color: C.green }]}>Friends ✓ · tap to remove</Text>
              </Pressable>
            )}
          </View>
        )}

        {clips.length > 0 && (
          <>
            <SectionTitle>Featured clips</SectionTitle>
            <View style={st.clipRow}>
              {clips.map((c) => (
                <Pressable key={c.id} onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${c.video_id}`)}>
                  <Image source={{ uri: `https://i.ytimg.com/vi/${c.video_id}/mqdefault.jpg` }} style={st.clipThumb} />
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  wrap: { padding: 18, paddingBottom: 40 },
  back: { color: C.cyan, fontWeight: '800', marginBottom: 16, fontSize: 13 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 68, height: 68, borderRadius: 34, borderWidth: 2.5, shadowOpacity: 0.7, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 5 },
  avatarFallback: { backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 26, fontWeight: '900' },
  handle: { color: C.text, fontSize: 21, fontWeight: '800' },
  rank: { color: C.gold, marginTop: 2, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  proBadge: { backgroundColor: 'rgba(255,200,61,0.15)', borderColor: C.gold, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  proBadgeText: { color: C.gold, fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  bio: { color: C.muted, lineHeight: 20, marginTop: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  metaChip: { borderColor: C.line2, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  metaChipText: { color: C.cyan, fontSize: 11, fontWeight: '800' },
  metaId: { color: C.dim, fontSize: 12 },
  statCard: { backgroundColor: C.bg2, borderColor: C.line, borderWidth: 1, borderRadius: 18, padding: 16, alignItems: 'center', marginTop: 16 },
  statNum: { color: C.cyan, fontSize: 28, fontWeight: '900', fontVariant: ['tabular-nums'] },
  statLbl: { color: C.dim, textTransform: 'uppercase', letterSpacing: 2, fontSize: 10, marginTop: 3 },
  friendRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btn: { backgroundColor: C.pink, borderRadius: 12, padding: 13, alignItems: 'center', flexGrow: 1 },
  btnText: { color: '#fff', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, fontSize: 12 },
  btnGhost: { borderColor: C.line2, borderWidth: 1, borderRadius: 12, padding: 13, alignItems: 'center', flexGrow: 1 },
  btnGhostText: { color: C.muted, fontWeight: '700', fontSize: 12 },
  clipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  clipThumb: { width: 156, height: 90, borderRadius: 12, backgroundColor: C.surface },
  muted: { color: C.muted, lineHeight: 20 },
});
