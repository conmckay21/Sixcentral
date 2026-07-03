import { useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { supabase } from '@/lib/supabase';
import { SITE } from '@/lib/site';
import { C } from '@/lib/theme';

/** Tile-pyramid map: crisp at every zoom, clustering, live pins. Base served by the site. */

type Pin = { id: string; name: string; region: string | null; blurb: string | null; image_url: string | null; source_note: string | null; collectible_type: string };
type CType = { id: string; slug: string; name: string; colour: string | null };

const TOTAL = 305;

export default function MapTab() {
  const insets = useSafeAreaInsets();
  const web = useRef<WebView>(null);
  const [types, setTypes] = useState<CType[]>([]);
  const [counts, setCounts] = useState({ landmarks: 0, finds: 0 });
  const [filter, setFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<Pin | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    supabase.from('collectible_types').select('id, slug, name, colour').then(({ data }) => {
      if (data) setTypes(data as CType[]);
    });
    supabase
      .from('map_pins')
      .select('collectible_type', { count: 'exact' })
      .eq('status', 'verified')
      .then(({ data }) => {
        if (!data) return;
        setCounts((c) => ({ ...c, landmarks: data.length }));
      });
  }, []);

  useEffect(() => {
    if (types.length && counts.landmarks) {
      const landmarkType = types.find((t) => t.slug === 'landmarks')?.id;
      // finds vs landmarks recomputed when pin data matters; landmarks-only pre-launch
      void landmarkType;
    }
  }, [types, counts.landmarks]);

  function applyFilter(id: string | null) {
    setFilter(id);
    web.current?.injectJavaScript(`window.setFilter(${id ? `'${id}'` : 'null'}); true;`);
  }

  return (
    <View style={st.root}>
      {failed ? (
        <View style={st.fail}>
          <Text style={st.failText}>The map could not load. Check the connection and try again.</Text>
          <Pressable style={st.retry} onPress={() => setFailed(false)}>
            <Text style={st.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <WebView
          ref={web}
          source={{ uri: `${SITE}/map-embed.html?v=7` }}
          style={st.web}
          onMessage={(e) => {
            try {
              setSelected(JSON.parse(e.nativeEvent.data) as Pin);
            } catch {
              // non-pin message; ignore
            }
          }}
          onError={() => setFailed(true)}
          allowsInlineMediaPlayback
          bounces={false}
          overScrollMode="never"
          setSupportMultipleWindows={false}
        />
      )}

      <View style={[st.topBar, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
        <View style={st.topRow} pointerEvents="box-none">
          <Text style={st.h1}>Leonida</Text>
          <View style={st.statChip}>
            <Text style={st.statText}>
              {counts.landmarks} landmarks · collectibles open with the game
            </Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 10 }}>
          <Pressable style={[st.chip, !filter && st.chipOn]} onPress={() => applyFilter(null)}>
            <Text style={[st.chipText, !filter && st.chipTextOn]}>All</Text>
          </Pressable>
          {types.map((t) => (
            <Pressable key={t.id} style={[st.chip, filter === t.id && st.chipOn]} onPress={() => applyFilter(filter === t.id ? null : t.id)}>
              <View style={[st.dot, { backgroundColor: t.colour ?? C.pink }]} />
              <Text style={[st.chipText, filter === t.id && st.chipTextOn]}>{t.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={st.sheetBack} onPress={() => setSelected(null)}>
          <Pressable style={st.sheet} onPress={() => {}}>
            {selected?.image_url ? (
              <Image source={{ uri: selected.image_url }} style={st.sheetImage} resizeMode="cover" />
            ) : null}
            <View style={st.sheetBody}>
              <View style={st.sheetHead}>
                <Text style={st.sheetTitle}>{selected?.name}</Text>
                {selected?.region ? (
                  <View style={st.regionChip}>
                    <Text style={st.regionChipText}>{selected.region}</Text>
                  </View>
                ) : null}
              </View>
              {selected?.blurb ? <Text style={st.sheetBlurb}>{selected.blurb}</Text> : null}
              {selected?.source_note ? <Text style={st.sheetSource}>Verified · {selected.source_note}</Text> : null}
              <Pressable style={st.sheetClose} onPress={() => setSelected(null)}>
                <Text style={st.sheetCloseText}>Close</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#5e9bc8' },
  web: { flex: 1, backgroundColor: '#5e9bc8' },
  fail: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  failText: { color: C.muted, textAlign: 'center', lineHeight: 20 },
  retry: { marginTop: 14, borderColor: C.line2, borderWidth: 1, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10 },
  retryText: { color: C.cyan, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, fontSize: 12 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'rgba(7,10,20,0.72)', borderBottomColor: C.line, borderBottomWidth: 1, paddingBottom: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  h1: { color: C.text, fontSize: 24, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 },
  statChip: { backgroundColor: 'rgba(20,17,38,0.9)', borderColor: C.line2, borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, maxWidth: '62%' },
  statText: { color: C.cyan, fontWeight: '800', fontSize: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderColor: C.line2, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, marginRight: 8, backgroundColor: 'rgba(20,17,38,0.85)' },
  chipOn: { backgroundColor: C.pink, borderColor: C.pink },
  chipText: { color: C.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  chipTextOn: { color: '#fff' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  sheetBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.bg2, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderColor: C.line2, borderWidth: 1, overflow: 'hidden' },
  sheetImage: { width: '100%', aspectRatio: 16 / 9, backgroundColor: C.surface },
  sheetBody: { padding: 18, paddingBottom: 34 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  sheetTitle: { color: C.text, fontSize: 20, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 1 },
  regionChip: { borderColor: C.gold, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: 'rgba(255,200,61,0.08)' },
  regionChipText: { color: C.gold, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  sheetBlurb: { color: C.muted, fontSize: 14, lineHeight: 21, marginTop: 10 },
  sheetSource: { color: C.dim, fontSize: 11, marginTop: 12 },
  sheetClose: { alignSelf: 'flex-start', borderColor: C.line2, borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9, marginTop: 16 },
  sheetCloseText: { color: C.cyan, fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
});
