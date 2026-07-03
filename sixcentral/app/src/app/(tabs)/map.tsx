import { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';

/**
 * Coordinate convention for map_pins: lat = y and lng = x, both normalised
 * 0..1 against the map canvas (top-left origin). Holds across base-map swaps.
 */

type Pin = { id: string; name: string; region: string | null; lat: number; lng: number; collectible_type: string; blurb: string | null; image_url: string | null; source_note: string | null };
type CType = { id: string; slug: string; name: string; colour: string | null };

function PinDot({ pin, colour, canvas, zoom, onPress }: { pin: Pin; colour: string; canvas: number; zoom: SharedValue<number>; onPress: () => void }) {
  const inverse = useAnimatedStyle(() => ({ transform: [{ scale: 1 / zoom.value }] }));
  return (
    <Animated.View style={[st.pinWrap, { left: pin.lng * canvas - 14, top: pin.lat * canvas - 14 }, inverse]}>
      <Pressable hitSlop={6} onPress={onPress} style={[st.pin, { backgroundColor: colour, shadowColor: colour }]} />
    </Animated.View>
  );
}

const MAP = require('../../../assets/images/leonida-schematic.png');
const TOTAL = 305;
const MAX_ZOOM = 12;
// Landmass bounding box within the square asset (normalised), from the render projection.
const LAND = { w: 0.580, h: 0.883 };

export default function MapTab() {
  const { width: vw, height: vh } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const size = Math.min(vw, vh);
  // Frame the LAND, not the image: open with the state filling the viewport.
  const fitCover = Math.max(vw / (LAND.w * size), vh / (LAND.h * size));
  const fitContain = Math.min(vw / (LAND.w * size), vh / (LAND.h * size));
  const [pins, setPins] = useState<Pin[]>([]);
  const [types, setTypes] = useState<CType[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<Pin | null>(null);

  const scale = useSharedValue(fitContain);
  const saved = useSharedValue(fitContain);
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
      scale.value = Math.min(MAX_ZOOM, Math.max(fitContain * 0.98, saved.value * e.scale));
    })
    .onEnd(() => {
      saved.value = scale.value;
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      const bx = Math.max(0, (LAND.w * size * scale.value - vw) / 2 + 24);
      const by = Math.max(0, (LAND.h * size * scale.value - vh) / 2 + 24);
      tx.value = Math.min(bx, Math.max(-bx, stx.value + e.translationX));
      ty.value = Math.min(by, Math.max(-by, sty.value + e.translationY));
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
  const landmarkType = types.find((t) => t.slug === 'landmarks')?.id;
  const landmarks = pins.filter((p) => p.collectible_type === landmarkType).length;
  const finds = pins.length - landmarks;

  return (
    <View style={st.root}>
      <GestureDetector gesture={composed}>
        <Animated.View style={[{ width: size, height: size, marginLeft: (vw - size) / 2, marginTop: (vh - size) / 2 }, anim]}>
          <Image source={MAP} style={{ width: size, height: size }} resizeMode="cover" />
          {shown.map((p) => (
            <PinDot key={p.id} pin={p} colour={colourOf(p.collectible_type)} canvas={size} zoom={scale} onPress={() => setSelected(p)} />
          ))}
        </Animated.View>
      </GestureDetector>

      <View style={[st.topBar, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
        <View style={st.topRow} pointerEvents="box-none">
          <Text style={st.h1}>Leonida</Text>
          <View style={st.statChip}>
            <Text style={st.statText}>
              {finds === 0 ? `${landmarks} landmarks · collectibles open with the game` : `${finds} / ${TOTAL} · ${landmarks} landmarks`}
            </Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 10 }}>
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
  root: { flex: 1, backgroundColor: '#070a14', overflow: 'hidden' },
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
  pinWrap: { position: 'absolute', width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  pin: { width: 14, height: 14, borderRadius: 7, borderColor: '#fff', borderWidth: 1.5, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  hint: { position: 'absolute', left: 16, color: 'rgba(237,231,245,0.45)', fontSize: 11 },
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
