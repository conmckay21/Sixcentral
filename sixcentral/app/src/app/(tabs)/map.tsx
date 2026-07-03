import { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';

/**
 * Coordinate convention for map_pins: lat = y and lng = x, both normalised
 * 0..1 against the map canvas (top-left origin). Holds across base-map swaps.
 */

type Pin = { id: string; name: string; region: string | null; lat: number; lng: number; collectible_type: string; blurb: string | null; image_url: string | null; source_note: string | null };
type CType = { id: string; slug: string; name: string; colour: string | null };

const MAP = require('../../../assets/images/leonida-schematic.png');
const TOTAL = 305;

export default function MapTab() {
  const [size, setSize] = useState(0);
  const [pins, setPins] = useState<Pin[]>([]);
  const [types, setTypes] = useState<CType[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<Pin | null>(null);

  const scale = useSharedValue(1);
  const saved = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const stx = useSharedValue(0);
  const sty = useSharedValue(0);

  useEffect(() => {
    supabase.from('collectible_types').select('id, slug, name, colour').then(({ data }) => {
      if (data) setTypes(data as CType[]);
    });
    supabase
      .from('map_pins')
      .select('id, name, region, lat, lng, collectible_type, blurb, image_url, source_note')
      .eq('status', 'verified')
      .then(({ data }) => {
        if (data) setPins(data as Pin[]);
      });
  }, []);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      const next = saved.value * e.scale;
      scale.value = Math.min(5, Math.max(1, next));
    })
    .onEnd(() => {
      saved.value = scale.value;
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      const bound = ((scale.value - 1) * size) / 2;
      tx.value = Math.min(bound, Math.max(-bound, stx.value + e.translationX));
      ty.value = Math.min(bound, Math.max(-bound, sty.value + e.translationY));
    })
    .onEnd(() => {
      stx.value = tx.value;
      sty.value = ty.value;
    });

  const composed = Gesture.Simultaneous(pinch, pan);

  const anim = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  const shown = useMemo(() => (filter ? pins.filter((p) => p.collectible_type === filter) : pins), [pins, filter]);
  const colourOf = (typeId: string) => types.find((t) => t.id === typeId)?.colour ?? C.pink;

  return (
    <SafeAreaView style={st.safe}>
      <View style={st.head}>
        <Text style={st.h1}>Leonida</Text>
        <View style={st.statChip}>
          <Text style={st.statText}>
            {(() => {
              const landmarkType = types.find((t) => t.slug === 'landmarks')?.id;
              const landmarks = pins.filter((p) => p.collectible_type === landmarkType).length;
              const finds = pins.length - landmarks;
              return finds === 0
                ? `${landmarks} landmarks · collectibles open with the game`
                : `${finds} / ${TOTAL} · ${landmarks} landmarks`;
            })()}
          </Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.chips} contentContainerStyle={{ paddingHorizontal: 16 }}>
        <Pressable style={[st.chip, !filter && st.chipOn]} onPress={() => setFilter(null)}>
          <Text style={[st.chipText, !filter && st.chipTextOn]}>All</Text>
        </Pressable>
        {types.map((t) => (
          <Pressable key={t.id} style={[st.chip, filter === t.id && st.chipOn]} onPress={() => setFilter(filter === t.id ? null : t.id)}>
            <View style={[st.dot, { backgroundColor: t.colour ?? C.pink }]} />
            <Text style={[st.chipText, filter === t.id && st.chipTextOn]}>{t.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={st.canvasWrap} onLayout={(e) => setSize(e.nativeEvent.layout.width)}>
        {size > 0 && (
          <GestureDetector gesture={composed}>
            <Animated.View style={[{ width: size, height: size }, anim]}>
              <Image source={MAP} style={{ width: size, height: size }} resizeMode="cover" />
              {shown.map((p) => (
                <Pressable
                  key={p.id}
                  style={[st.pin, { left: p.lng * size - 7, top: p.lat * size - 7, backgroundColor: colourOf(p.collectible_type), shadowColor: colourOf(p.collectible_type) }]}
                  onPress={() => setSelected(p)}
                />
              ))}
            </Animated.View>
          </GestureDetector>
        )}
      </View>

      <Text style={st.note}>
        Pinch to zoom, drag to pan. Every find is community-pinned and confirmed before it
        counts. Full cartography lands with the game.
      </Text>

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
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 6 },
  h1: { color: C.text, fontSize: 28, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 },
  statChip: { backgroundColor: C.bg2, borderColor: C.line2, borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
  statText: { color: C.cyan, fontWeight: '800', fontSize: 10 },
  chips: { marginTop: 12, maxHeight: 40 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderColor: C.line2, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, marginRight: 8 },
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
  canvasWrap: { marginTop: 12, marginHorizontal: 16, borderRadius: 18, overflow: 'hidden', borderColor: C.line, borderWidth: 1, aspectRatio: 1 },
  pin: { position: 'absolute', width: 14, height: 14, borderRadius: 7, borderColor: '#fff', borderWidth: 1.5, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  note: { color: C.dim, fontSize: 11, lineHeight: 16, margin: 16 },
});
