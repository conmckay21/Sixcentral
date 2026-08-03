import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { SectionTitle } from '@/components/ui';

type SetRow = {
  slug: string;
  name: string;
  total: number | null;
  cadence: 'permanent' | 'daily' | 'seasonal';
  reward: string;
  sort: number;
};

const CADENCE_TITLES: Record<string, string> = {
  permanent: 'The permanent nine',
  daily: 'The daily family',
  seasonal: 'The seasonal calendar',
};

const CADENCE_NOTES: Record<string, string> = {
  permanent: 'One-time hunts. Tick items off as you collect, in any order.',
  daily: 'These reset every day. Fold them into the daily route rather than tracking each one.',
  seasonal: 'Only live while their event runs. Progress keeps between events.',
};

export default function CollectiblesHome() {
  const router = useRouter();
  const [sets, setSets] = useState<SetRow[] | null>(null);
  const [done, setDone] = useState<Record<string, number>>({});
  const [signedIn, setSignedIn] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('collectible_sets')
      .select('slug,name,total,cadence,reward,sort')
      .eq('published', true)
      .eq('game_slug', 'gta-online')
      .order('sort', { ascending: true });
    setSets((data as SetRow[]) ?? []);

    const { data: sess } = await supabase.auth.getSession();
    const uid = sess?.session?.user?.id;
    setSignedIn(!!uid);
    if (uid) {
      const { data: prog } = await supabase
        .from('user_collectible_progress')
        .select('set_slug');
      const counts: Record<string, number> = {};
      for (const row of prog ?? []) {
        counts[row.set_slug] = (counts[row.set_slug] ?? 0) + 1;
      }
      setDone(counts);
    } else {
      setDone({});
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const groups: Array<SetRow['cadence']> = ['permanent', 'seasonal', 'daily'];

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={st.wrap}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.pink} />}
      >
        <Text style={st.h1}>COLLECTIBLES TRACKER</Text>
        <Text style={st.sub}>
          Every set in GTA Online, synced to your SixCentral account. The full hunting guide sits on
          the guides desk.
        </Text>
        {!signedIn ? (
          <View style={st.signin}>
            <Text style={st.signinText}>Sign in to tick items off and sync your progress.</Text>
          </View>
        ) : null}

        {groups.map((cad) => {
          const rows = (sets ?? []).filter((s) => s.cadence === cad);
          if (!rows.length) return null;
          return (
            <View key={cad} style={{ marginTop: 18 }}>
              <SectionTitle>{CADENCE_TITLES[cad]}</SectionTitle>
              <Text style={st.note}>{CADENCE_NOTES[cad]}</Text>
              {rows.map((s) => {
                const collected = done[s.slug] ?? 0;
                const trackable = cad !== 'daily' && !!s.total;
                const pct = trackable && s.total ? Math.min(1, collected / s.total) : 0;
                const card = (
                  <View style={st.card}>
                    <View style={st.cardTop}>
                      <Text style={st.cardName}>{s.name}</Text>
                      {trackable && s.total ? (
                        <Text style={st.cardCount}>
                          {collected}/{s.total}
                        </Text>
                      ) : (
                        <Text style={st.cardDaily}>{cad === 'daily' ? 'DAILY' : 'EVENT'}</Text>
                      )}
                    </View>
                    <Text style={st.cardReward} numberOfLines={2}>
                      {s.reward}
                    </Text>
                    {trackable ? (
                      <View style={st.bar}>
                        <View style={[st.barFill, { width: `${Math.round(pct * 100)}%` }]} />
                      </View>
                    ) : null}
                  </View>
                );
                return trackable ? (
                  <Pressable key={s.slug} onPress={() => router.push(`/collectibles/${s.slug}` as Href)}>
                    {card}
                  </Pressable>
                ) : (
                  <View key={s.slug}>{card}</View>
                );
              })}
            </View>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  wrap: { paddingHorizontal: 16, paddingTop: 8 },
  h1: { color: C.text, fontSize: 22, fontWeight: '900', letterSpacing: 0.5 },
  sub: { color: C.muted, fontSize: 12.5, lineHeight: 18, marginTop: 6 },
  signin: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: C.pink,
    borderRadius: 12,
    padding: 10,
    backgroundColor: 'rgba(255,46,136,0.08)',
  },
  signinText: { color: C.pink, fontSize: 12, fontWeight: '700' },
  note: { color: C.dim, fontSize: 11.5, lineHeight: 16, marginBottom: 10, marginTop: 2 },
  card: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { color: C.text, fontSize: 14.5, fontWeight: '800', flex: 1, paddingRight: 8 },
  cardCount: { color: C.cyan, fontSize: 12, fontWeight: '800' },
  cardDaily: { color: C.dim, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  cardReward: { color: C.muted, fontSize: 11.5, lineHeight: 16, marginTop: 5 },
  bar: {
    height: 6,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: C.line,
    overflow: 'hidden',
    marginTop: 9,
  },
  barFill: { height: '100%', backgroundColor: C.pink },
});
