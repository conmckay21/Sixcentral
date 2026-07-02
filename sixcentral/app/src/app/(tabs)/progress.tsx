import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';

type Rank = { id: number; name: string; min_respect: number };

export default function Progress() {
  const [session, setSession] = useState<Session | null>(null);
  const [respect, setRespect] = useState(0);
  const [rankId, setRankId] = useState(0);
  const [staff, setStaff] = useState(false);
  const [ranks, setRanks] = useState<Rank[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.from('ranks').select('id, name, min_respect').order('id').then(({ data }) => {
      if (data) setRanks(data as Rank[]);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    supabase
      .from('public_profiles')
      .select('respect, rank_id, is_staff')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setRespect(data.respect as number);
          setRankId(data.rank_id as number);
          setStaff(data.is_staff as boolean);
        }
      });
  }, [session]);

  const current = ranks.find((r) => r.id === rankId);
  const next = ranks.find((r) => r.id === rankId + 1);
  const pct = next && current ? Math.min(1, (respect - current.min_respect) / (next.min_respect - current.min_respect)) : 1;

  return (
    <SafeAreaView style={st.safe}>
      <View style={st.wrap}>
        <Text style={st.h1}>Progress</Text>
        {!session ? (
          <Text style={st.muted}>Sign in on the Profile tab and your Come-Up progress lives here.</Text>
        ) : staff ? (
          <View style={st.card}>
            <Text style={st.rankName}>Above the ladder</Text>
            <Text style={st.muted}>Staff run the board. They do not compete on it.</Text>
          </View>
        ) : (
          <View style={st.card}>
            <Text style={st.rankName}>{current?.name ?? '…'}</Text>
            <Text style={st.respect}>{respect.toLocaleString('en-GB')} Respect</Text>
            <View style={st.barOuter}>
              <View style={[st.barInner, { width: `${Math.round(pct * 100)}%` }]} />
            </View>
            {next ? (
              <Text style={st.next}>
                {(next.min_respect - respect).toLocaleString('en-GB')} to {next.name}
              </Text>
            ) : (
              <Text style={st.next}>Top of the ladder. City Legend.</Text>
            )}
          </View>
        )}
        <Text style={st.tracker}>The 100% tracker syncs here at launch: every collectible, every tick, on the go.</Text>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  wrap: { flex: 1, padding: 20 },
  h1: { color: C.text, fontSize: 30, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 },
  card: { backgroundColor: C.bg2, borderColor: C.line, borderWidth: 1, borderRadius: 16, padding: 20, marginBottom: 16 },
  rankName: { color: C.gold, fontSize: 18, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  respect: { color: C.cyan, fontSize: 28, fontWeight: '900', marginVertical: 8, fontVariant: ['tabular-nums'] },
  barOuter: { height: 8, backgroundColor: C.surface, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  barInner: { height: 8, backgroundColor: C.pink, borderRadius: 4 },
  next: { color: C.muted, fontSize: 12 },
  muted: { color: C.muted, lineHeight: 20 },
  tracker: { color: C.dim, lineHeight: 20 },
});
