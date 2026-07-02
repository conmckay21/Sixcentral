import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';

const LAUNCH = new Date('2026-11-19T00:00:00Z').getTime();

type Row = { id: string; handle: string; respect: number; rank_name: string; title: string | null };

function useCountdown() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, LAUNCH - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s };
}

export default function Home() {
  const { d, h, m, s } = useCountdown();
  const [board, setBoard] = useState<Row[]>([]);

  useEffect(() => {
    supabase
      .from('leaderboard_all')
      .select('id, handle, respect, rank_name, title')
      .limit(5)
      .then(({ data }) => {
        if (data) setBoard(data as Row[]);
      });
  }, []);

  return (
    <SafeAreaView style={st.safe}>
      <View style={st.wrap}>
        <Text style={st.brandSix}>SIX</Text>
        <Text style={st.brandCentral}>CENTRAL</Text>
        <Text style={st.kicker}>Grand Theft Auto VI launch countdown</Text>
        <View style={st.cd}>
          {[
            [d, 'days'],
            [h, 'hrs'],
            [m, 'min'],
            [s, 'sec'],
          ].map(([v, l]) => (
            <View key={l as string} style={st.cdCell}>
              <Text style={st.cdNum}>{String(v).padStart(2, '0')}</Text>
              <Text style={st.cdLbl}>{l}</Text>
            </View>
          ))}
        </View>

        <Text style={st.section}>The Come-Up · top five</Text>
        <FlatList
          data={board}
          keyExtractor={(r) => r.id}
          ListEmptyComponent={<Text style={st.muted}>The board opens with the first crew members.</Text>}
          renderItem={({ item, index }) => (
            <View style={st.row}>
              <Text style={st.pos}>{index + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={st.handle}>@{item.handle}</Text>
                <Text style={st.rank}>
                  {item.title ? `${item.title} · ` : ''}
                  {item.rank_name}
                </Text>
              </View>
              <Text style={st.pts}>{item.respect.toLocaleString('en-GB')}</Text>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  wrap: { flex: 1, padding: 20 },
  brandSix: { color: C.pink, fontSize: 44, fontWeight: '900', letterSpacing: 4, lineHeight: 46 },
  brandCentral: { color: C.cyan, fontSize: 44, fontWeight: '900', letterSpacing: 4, lineHeight: 46, marginBottom: 14 },
  kicker: { color: C.dim, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  cd: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  cdCell: { backgroundColor: C.bg2, borderColor: C.line2, borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center', minWidth: 66 },
  cdNum: { color: C.text, fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] },
  cdLbl: { color: C.dim, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 },
  section: { color: C.gold, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.bg2, borderColor: C.line, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  pos: { color: C.gold, fontWeight: '800', width: 22, textAlign: 'center' },
  handle: { color: C.text, fontWeight: '700' },
  rank: { color: C.muted, fontSize: 12 },
  pts: { color: C.cyan, fontWeight: '800', fontVariant: ['tabular-nums'] },
  muted: { color: C.muted },
});
