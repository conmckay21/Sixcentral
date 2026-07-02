import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { C, G, GRAD } from '@/lib/theme';
import { SectionTitle } from '@/components/ui';

type Profile = {
  handle: string;
  title: string | null;
  avatar_url: string | null;
  respect: number;
  rank_id: number;
  is_staff: boolean;
  is_pro: boolean;
};
type Rank = { id: number; name: string };
type Row = { id: string; handle: string; respect: number; rank_name: string; title: string | null };

export default function ProfileTab() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [board, setBoard] = useState<Row[]>([]);

  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }
    supabase
      .from('public_profiles')
      .select('handle, title, avatar_url, respect, rank_id, is_staff, is_pro')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data as Profile);
      });
    supabase.from('ranks').select('id, name').order('id').then(({ data }) => {
      if (data) setRanks(data as Rank[]);
    });
    supabase
      .from('leaderboard_all')
      .select('id, handle, respect, rank_name, title')
      .limit(5)
      .then(({ data }) => {
        if (data) setBoard(data as Row[]);
      });
  }, [session]);

  async function go() {
    if (busy) return;
    setBusy(true);
    setMsg('');
    const fn =
      mode === 'signin'
        ? supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
        : supabase.auth.signUp({ email: email.trim(), password: pw });
    const { error } = await fn;
    if (error) setMsg(mode === 'signin' ? 'Could not sign you in. Check the details.' : 'Could not create the account. Passwords need 8+ characters.');
    setBusy(false);
  }

  if (!ready) {
    return (
      <SafeAreaView style={st.safe}>
        <ActivityIndicator color={C.pink} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={st.safe}>
        <View style={st.authWrap}>
          <Text style={st.h1}>{mode === 'signin' ? 'Sign in' : 'Join the crew'}</Text>
          <Text style={st.sub}>Same account as the website. Handle, Respect, everything carries.</Text>
          <TextInput style={st.input} placeholder="Email" placeholderTextColor={C.dim} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <TextInput style={st.input} placeholder="Password" placeholderTextColor={C.dim} secureTextEntry value={pw} onChangeText={setPw} />
          {msg ? <Text style={st.err}>{msg}</Text> : null}
          <Pressable style={st.btn} onPress={go} disabled={busy}>
            <Text style={st.btnText}>{busy ? 'One sec…' : mode === 'signin' ? 'Sign in' : 'Create account'}</Text>
          </Pressable>
          <Pressable onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
            <Text style={st.swap}>{mode === 'signin' ? 'New here? Create an account' : 'Already in? Sign in'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const rankName = profile && !profile.is_staff ? ranks.find((r) => r.id === profile.rank_id)?.name : undefined;

  return (
    <SafeAreaView style={st.safe}>
      <ScrollView contentContainerStyle={st.wrap} showsVerticalScrollIndicator={false}>
        <View style={st.head}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={st.avatar} />
          ) : (
            <View style={[st.avatar, st.avatarFallback]}>
              <Text style={st.avatarLetter}>{profile?.handle?.slice(0, 1).toUpperCase() ?? '?'}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={st.handle}>@{profile?.handle ?? '…'}</Text>
            <Text style={st.rank}>
              {profile?.title ? `${profile.title}` : ''}
              {profile?.title && (rankName || profile?.is_staff) ? ' · ' : ''}
              {profile?.is_staff ? 'Above the ladder' : rankName ?? ''}
            </Text>
          </View>
          {profile?.is_pro && (
            <View style={st.proBadge}>
              <Text style={st.proBadgeText}>PRO</Text>
            </View>
          )}
        </View>

        <View style={st.statCard}>
          <Text style={st.statNum}>{profile?.respect?.toLocaleString('en-GB') ?? '0'}</Text>
          <Text style={st.statLbl}>Respect</Text>
        </View>

        {profile && !profile.is_pro && (
          <LinearGradient colors={G.hot} {...GRAD} style={st.proCard}>
            <View style={st.proShade} />
            <Text style={st.proKicker}>SixCentral Pro</Text>
            <Text style={st.proTitle}>Full map. Unlimited tracking. Ad free.</Text>
            <Text style={st.proPrice}>From £14.99 a year · arrives with the game</Text>
          </LinearGradient>
        )}

        <SectionTitle>The Come-Up · top five</SectionTitle>
        {board.length === 0 ? (
          <Text style={st.muted}>The board opens with the first crew members.</Text>
        ) : (
          board.map((r, i) => (
            <View key={r.id} style={st.row}>
              <Text style={st.pos}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={st.rowHandle}>@{r.handle}</Text>
                <Text style={st.rowRank}>
                  {r.title ? `${r.title} · ` : ''}
                  {r.rank_name}
                </Text>
              </View>
              <Text style={st.pts}>{r.respect.toLocaleString('en-GB')}</Text>
            </View>
          ))
        )}

        <Text style={st.note}>Bio, flair, friends and gamer IDs are managed on the website for now. The app catches up fast.</Text>
        <Pressable style={st.signout} onPress={() => supabase.auth.signOut()}>
          <Text style={st.signoutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  wrap: { padding: 18, paddingBottom: 40 },
  authWrap: { flex: 1, padding: 20 },
  h1: { color: C.text, fontSize: 30, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 },
  sub: { color: C.muted, marginTop: 6, marginBottom: 20, lineHeight: 20 },
  input: { backgroundColor: C.bg2, borderColor: C.line2, borderWidth: 1, borderRadius: 12, color: C.text, padding: 14, marginBottom: 12 },
  btn: { backgroundColor: C.pink, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  swap: { color: C.cyan, marginTop: 16, textAlign: 'center' },
  err: { color: C.pinkL, marginBottom: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  avatar: { width: 68, height: 68, borderRadius: 34, borderWidth: 2, borderColor: C.pink },
  avatarFallback: { backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: C.pink, fontSize: 26, fontWeight: '900' },
  handle: { color: C.text, fontSize: 21, fontWeight: '800' },
  rank: { color: C.gold, marginTop: 2, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  proBadge: { backgroundColor: 'rgba(255,200,61,0.15)', borderColor: C.gold, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  proBadgeText: { color: C.gold, fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  statCard: { backgroundColor: C.bg2, borderColor: C.line, borderWidth: 1, borderRadius: 18, padding: 18, alignItems: 'center', marginBottom: 14 },
  statNum: { color: C.cyan, fontSize: 32, fontWeight: '900', fontVariant: ['tabular-nums'] },
  statLbl: { color: C.dim, textTransform: 'uppercase', letterSpacing: 2, fontSize: 11, marginTop: 4 },
  proCard: { borderRadius: 18, padding: 18, overflow: 'hidden' },
  proShade: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,8,16,0.4)' },
  proKicker: { color: '#fff', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, opacity: 0.9 },
  proTitle: { color: '#fff', fontSize: 18, fontWeight: '900', lineHeight: 23, marginTop: 6 },
  proPrice: { color: 'rgba(255,255,255,0.85)', marginTop: 8, fontSize: 12, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.bg2, borderColor: C.line, borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 8 },
  pos: { color: C.gold, fontWeight: '900', width: 22, textAlign: 'center' },
  rowHandle: { color: C.text, fontWeight: '700' },
  rowRank: { color: C.muted, fontSize: 12 },
  pts: { color: C.cyan, fontWeight: '800', fontVariant: ['tabular-nums'] },
  muted: { color: C.muted, lineHeight: 20 },
  note: { color: C.dim, lineHeight: 19, fontSize: 12, marginTop: 20 },
  signout: { marginTop: 18, borderColor: C.line2, borderWidth: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  signoutText: { color: C.muted, textTransform: 'uppercase', letterSpacing: 1, fontSize: 12 },
});
