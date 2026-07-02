import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C } from '@/lib/theme';

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={s.row}>
      <Text style={s.title}>{children}</Text>
      {right}
    </View>
  );
}

export function Chip({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <View style={[s.chip, active && s.chipOn]}>
      <Text style={[s.chipText, active && s.chipTextOn]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 12 },
  title: { color: C.text, fontSize: 17, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 },
  chip: { borderColor: C.line2, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 },
  chipOn: { backgroundColor: C.pink, borderColor: C.pink },
  chipText: { color: C.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  chipTextOn: { color: '#fff' },
});
