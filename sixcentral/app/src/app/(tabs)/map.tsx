import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '@/lib/theme';
import { Chip } from '@/components/ui';

const PINS = [
  { top: '18%', left: '22%', c: C.pink },
  { top: '34%', left: '64%', c: C.cyan },
  { top: '52%', left: '38%', c: C.gold },
  { top: '66%', left: '72%', c: C.pink },
  { top: '74%', left: '18%', c: C.cyan },
  { top: '28%', left: '84%', c: C.gold },
] as const;

export default function MapTab() {
  return (
    <SafeAreaView style={st.safe}>
      <ScrollView contentContainerStyle={st.wrap} showsVerticalScrollIndicator={false}>
        <Text style={st.h1}>Leonida</Text>
        <View style={st.statChip}>
          <Text style={st.statText}>0 / 305 found · opens with the game</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.chips}>
          <Chip label="Collectibles" active />
          <Chip label="Stunt jumps" />
          <Chip label="Businesses" />
          <Chip label="Signal towers" />
          <Chip label="Trophies" />
        </ScrollView>

        <View style={st.map}>
          {[...Array(5)].map((_, i) => (
            <View key={`h${i}`} style={[st.gridH, { top: `${(i + 1) * 16}%` }]} />
          ))}
          {[...Array(4)].map((_, i) => (
            <View key={`v${i}`} style={[st.gridV, { left: `${(i + 1) * 20}%` }]} />
          ))}
          {PINS.map((p, i) => (
            <View key={i} style={[st.pin, { top: p.top, left: p.left, backgroundColor: p.c, shadowColor: p.c }]} />
          ))}
          <View style={st.mapNoteWrap}>
            <Text style={st.mapNoteTitle}>The map lands in Phase 3</Text>
            <Text style={st.mapNoteBody}>
              Every collectible, stunt jump, business and signal tower, pinned by the crew and
              confirmed before it counts. The database behind it is already live.
            </Text>
          </View>
        </View>

        <View style={st.openBtn}>
          <Text style={st.openBtnText}>Open full map ⛶ · with the game</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  wrap: { padding: 18, paddingBottom: 40 },
  h1: { color: C.text, fontSize: 30, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 },
  statChip: { alignSelf: 'flex-start', backgroundColor: C.bg2, borderColor: C.line2, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, marginTop: 10 },
  statText: { color: C.cyan, fontWeight: '800', fontSize: 12 },
  chips: { marginTop: 16, marginBottom: 16 },
  map: { height: 340, backgroundColor: C.bg2, borderColor: C.line, borderWidth: 1, borderRadius: 18, overflow: 'hidden', justifyContent: 'flex-end' },
  gridH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: C.line },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: C.line },
  pin: { position: 'absolute', width: 10, height: 10, borderRadius: 5, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  mapNoteWrap: { padding: 16, backgroundColor: 'rgba(11,8,16,0.72)' },
  mapNoteTitle: { color: C.pinkL, fontWeight: '900', fontSize: 15, textTransform: 'uppercase', letterSpacing: 1 },
  mapNoteBody: { color: C.muted, marginTop: 6, lineHeight: 19, fontSize: 13 },
  openBtn: { marginTop: 14, borderColor: C.line2, borderWidth: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  openBtnText: { color: C.dim, fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
});
