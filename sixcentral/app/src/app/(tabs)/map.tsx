import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '@/lib/theme';

export default function MapTab() {
  return (
    <SafeAreaView style={st.safe}>
      <View style={st.wrap}>
        <Text style={st.h1}>Leonida</Text>
        <View style={st.card}>
          <Text style={st.big}>305 finds. One map. Yours to fill.</Text>
          <Text style={st.body}>
            The interactive map arrives in Phase 3: every collectible, stunt jump, business and
            signal tower, pinned by the community and confirmed before it counts. The database
            behind it is already live.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  wrap: { flex: 1, padding: 20 },
  h1: { color: C.text, fontSize: 30, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 },
  card: { backgroundColor: C.bg2, borderColor: C.pink, borderWidth: 1, borderRadius: 16, padding: 20 },
  big: { color: C.pinkL, fontSize: 20, fontWeight: '800', marginBottom: 10 },
  body: { color: C.muted, lineHeight: 21 },
});
