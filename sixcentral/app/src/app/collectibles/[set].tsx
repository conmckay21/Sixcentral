import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

type SetRow = {
  slug: string;
  name: string;
  total: number | null;
  reward: string;
  hint: string | null;
};

type ItemRow = { idx: number; label: string; notes: string | null };

export default function CollectibleSet() {
  const { set: setSlug } = useLocalSearchParams<{ set: string }>();
  const [meta, setMeta] = useState<SetRow | null>(null);
  const [items, setItems] = useState<Record<number, ItemRow>>({});
  const [ticked, setTicked] = useState<Set<number>>(new Set());
  const [uid, setUid] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!setSlug) return;
    const { data: s } = await supabase
      .from('collectible_sets')
      .select('slug,name,total,reward,hint')
      .eq('slug', setSlug)
      .maybeSingle();
    setMeta((s as SetRow) ?? null);

    const { data: it } = await supabase
      .from('collectible_items')
      .select('idx,label,notes')
      .eq('set_slug', setSlug)
      .order('idx', { ascending: true });
    const byIdx: Record<number, ItemRow> = {};
    for (const row of (it as ItemRow[]) ?? []) byIdx[row.idx] = row;
    setItems(byIdx);

    const { data: sess } = await supabase.auth.getSession();
    const userId = sess?.session?.user?.id ?? null;
    setUid(userId);
    if (userId) {
      const { data: prog } = await supabase
        .from('user_collectible_progress')
        .select('idx')
        .eq('set_slug', setSlug);
      setTicked(new Set((prog ?? []).map((r) => r.idx as number)));
    }
  }, [setSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = useCallback(
    async (idx: number) => {
      if (!uid || !setSlug) return;
      const on = ticked.has(idx);
      setSelected(idx);
      setTicked((prev) => {
        const next = new Set(prev);
        if (on) next.delete(idx);
        else next.add(idx);
        return next;
      });
      if (on) {
        const { error } = await supabase
          .from('user_collectible_progress')
          .delete()
          .eq('set_slug', setSlug)
          .eq('idx', idx);
        if (error) setTicked((prev) => new Set(prev).add(idx));
      } else {
        const { error } = await supabase
          .from('user_collectible_progress')
          .insert({ user_id: uid, set_slug: setSlug, idx });
        if (error)
          setTicked((prev) => {
            const next = new Set(prev);
            next.delete(idx);
            return next;
          });
      }
    },
    [uid, setSlug, ticked]
  );

  const total = meta?.total ?? 0;
  const numbers = useMemo(() => Array.from({ length: total }, (_, i) => i + 1), [total]);
  const hasLabels = useMemo(() => Object.keys(items).length > 0, [items]);
  const selectedItem = selected != null ? items[selected] : undefined;

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <ScrollView contentContainerStyle={st.wrap}>
        <Text style={st.h1}>{meta?.name?.toUpperCase() ?? 'COLLECTIBLES'}</Text>
        {meta ? (
          <Text style={st.reward}>{meta.reward}</Text>
        ) : null}
        {meta?.hint ? (
          <View style={st.hintBox}>
            <Text style={st.hintText}>{meta.hint}</Text>
          </View>
        ) : null}
        <View style={st.progressRow}>
          <Text style={st.progressText}>
            {ticked.size}/{total} collected
          </Text>
          <View style={st.bar}>
            <View
              style={[st.barFill, { width: total ? `${Math.round((ticked.size / total) * 100)}%` : '0%' }]}
            />
          </View>
        </View>
        {!uid ? (
          <View style={st.signin}>
            <Text style={st.signinText}>Sign in to tick items off and sync your progress.</Text>
          </View>
        ) : null}

        {hasLabels ? (
          <View style={{ marginTop: 14 }}>
            {numbers.map((n) => {
              const on = ticked.has(n);
              const item = items[n];
              return (
                <Pressable
                  key={n}
                  onPress={() => toggle(n)}
                  style={[st.row, on && st.rowOn, !uid && st.tileDisabled]}
                >
                  <View style={[st.tick, on && st.tickOn]}>
                    {on ? <Text style={st.tickMark}>✓</Text> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[st.rowLabel, on && st.rowLabelOn]}>
                      #{n}  {item?.label ?? ''}
                    </Text>
                    {item?.notes ? <Text style={st.rowNotes}>{item.notes}</Text> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <>
            <View style={st.grid}>
              {numbers.map((n) => {
                const on = ticked.has(n);
                return (
                  <Pressable
                    key={n}
                    onPress={() => toggle(n)}
                    style={[st.tile, on && st.tileOn, !uid && st.tileDisabled]}
                  >
                    <Text style={[st.tileText, on && st.tileTextOn]}>{n}</Text>
                  </Pressable>
                );
              })}
            </View>
            {selectedItem ? (
              <View style={st.detail}>
                <Text style={st.detailLabel}>
                  #{selected}: {selectedItem.label}
                </Text>
                {selectedItem.notes ? <Text style={st.detailNotes}>{selectedItem.notes}</Text> : null}
              </View>
            ) : (
              <Text style={st.hint}>
                Tick items in any order as you collect them. Item names and locations appear here as
                the SixCentral atlas fills in.
              </Text>
            )}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  wrap: { paddingHorizontal: 16, paddingTop: 8 },
  h1: { color: C.text, fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
  reward: { color: C.muted, fontSize: 12, lineHeight: 17, marginTop: 6 },
  progressRow: { marginTop: 14 },
  progressText: { color: C.cyan, fontSize: 12, fontWeight: '800', marginBottom: 6 },
  bar: {
    height: 8,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: C.line,
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: C.pink },
  signin: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: C.pink,
    borderRadius: 12,
    padding: 10,
    backgroundColor: 'rgba(255,46,136,0.08)',
  },
  signinText: { color: C.pink, fontSize: 12, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  tile: {
    width: 48,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  tileOn: { borderColor: C.pink, backgroundColor: 'rgba(255,46,136,0.16)' },
  tileDisabled: { opacity: 0.5 },
  tileText: { color: C.muted, fontSize: 13, fontWeight: '800' },
  tileTextOn: { color: C.pink },
  detail: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  detailLabel: { color: C.text, fontSize: 13, fontWeight: '800' },
  detailNotes: { color: C.muted, fontSize: 12, lineHeight: 17, marginTop: 5 },
  hint: { color: C.dim, fontSize: 11.5, lineHeight: 16, marginTop: 16 },
  hintBox: { marginTop: 12, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 11, backgroundColor: 'rgba(31,229,214,0.05)' },
  hintText: { color: C.muted, fontSize: 12, lineHeight: 17 },
  row: { flexDirection: 'row', gap: 10, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 11, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.02)', alignItems: 'flex-start' },
  rowOn: { borderColor: C.pink, backgroundColor: 'rgba(255,46,136,0.08)' },
  tick: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: C.line, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  tickOn: { borderColor: C.pink, backgroundColor: C.pink },
  tickMark: { color: '#fff', fontSize: 13, fontWeight: '900', lineHeight: 15 },
  rowLabel: { color: C.text, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  rowLabelOn: { color: C.pink },
  rowNotes: { color: C.dim, fontSize: 11.5, lineHeight: 16, marginTop: 3 },
});
