import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';
import { SectionTitle } from '@/components/ui';

type Rank = { id: number; name: string; min_respect: number };
const CATEGORIES = ['Collectibles', 'Stunt jumps', 'Businesses', 'Signal towers', 'Trophies'];

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
      <ScrollView contentContainerStyle={st.wrap} showsVerticalScrollIndicator={false}>
        <Text style={st.h1}>Progress</Text>

        <View style={st.overall}>
          <Text style={st.overallPct}>0%</Text>
          <Text style={st.overallLabel}>Overall completion · syncs at launch</Text>
          <View style={st.barOuter}>
            <View style={[st.barInner, { width: '0%' }]} />
          </View>
        </View>

        <SectionTitle>By category</SectionTitle>
        {CATEGORIES.map((c) => (
          <View key={c} style={st.catRow}>
            <View style={st.catTop}>
              <Text style={st.catName}>{c}</Text>
              <Text style={st.catCount}>0 / —</Text>
            </View>
            <View style={st.barOuter}>
              <View style={[st.barInner, { width: '0%' }]} />
            </View>
          </View>
        ))}

        <SectionTitle>The Come-Up</SectionTitle>
        {!session ? (
          <Text style={st.muted}>Sign in on the Profile tab and your rank lives here.</Text>
        ) : staff ? (
          <View style={st.rankCard}>
            <Text style={st.rankName}>Above the ladder</Text>
            <Text style={st.muted}>Staff run the board. They do not compete on it.</Text>
          </View>
        ) : (
          <View style={st.rankCard}>
            <Text style={st.rankName}>{current?.name ?? '…'}</Text>
            <Text style={st.respect}>{respect.toLocaleString('en-GB')} Respect</Text>
            <View style={st.barOuter}>
              <View style={[st.barInner, { width: `${Math.round(pct * 100)}%` }]} />
            </View>
            {next ? (
              <Text style={st.next}>{(next.min_respect - respect).toLocaleString('en-GB')} to {next.name}</Text>
            ) : (
              <Text style={st.next}>Top of the ladder. City Legend.</Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  wrap: { padding: 18, paddingBottom: 40 },
  h1: { color: C.text, fontSize: 30, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 },
  overall: { backgroundColor: C.bg2, borderColor: C.line, borderWidth: 1, borderRadius: 18, padding: 18 },
  overallPct: { color: C.cyan, fontSize: 40, fontWeight: '900', fontVariant: ['tabular-nums'] },
  overallLabel: { color: C.dim, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 2 },
  catRow: { marginBottom: 12 },
  catTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  catName: { color: C.text, fontWeight: '700', fontSize: 13 },
  catCount: { color: C.dim, fontWeight: '700', fontSize: 12, fontVariant: ['tabular-nums'] },
  barOuter: { height: 7, backgroundColor: C.surface, borderRadius: 4, overflow: 'hidden' },
  barInner: { height: 7, backgroundColor: C.pink, borderRadius: 4 },
  rankCard: { backgroundColor: C.bg2, borderColor: C.line, borderWidth: 1, borderRadius: 18, padding: 18 },
  rankName: { color: C.gold, fontSize: 17, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  respect: { color: C.cyan, fontSize: 26, fontWeight: '900', marginVertical: 8, fontVariant: ['tabular-nums'] },
  next: { color: C.muted, fontSize: 12, marginTop: 8 },
  muted: { color: C.muted, lineHeight: 20 },
});
