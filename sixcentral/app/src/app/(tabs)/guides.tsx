import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '@/lib/theme';
import { SectionTitle } from '@/components/ui';

const SITE = 'https://sixcentral.co.uk';

const LIVE = [
  {
    t: 'Everything confirmed so far',
    d: 'The verified list: setting, characters, dates, editions. No rumours.',
    url: `${SITE}/news/everything-confirmed`,
  },
  {
    t: 'The guides desk',
    d: 'The full plan, A to Z, and what goes live the day the game does.',
    url: `${SITE}/guides`,
  },
];

const DAY_ONE = [
  { t: 'Story walkthrough', d: 'Spoiler-safe, mission by mission, from the first job.' },
  { t: 'The 100% checklist', d: 'Every tick on one page, synced to your tracker.' },
  { t: 'Collectibles atlas', d: 'All of them, pinned on the community map and confirmed.' },
  { t: 'Money and businesses', d: 'What earns, what burns, and the order that matters.' },
  { t: 'Weapons and loadouts', d: 'Every gun, every mod, what to carry and when.' },
  { t: 'Trophies and platinum', d: 'The road to 100%, missable flags called out early.' },
];

export default function Guides() {
  return (
    <SafeAreaView style={st.safe}>
      <ScrollView contentContainerStyle={st.wrap} showsVerticalScrollIndicator={false}>
        <Text style={st.h1}>Guides</Text>
        <Text style={st.sub}>Verified before it is published. No guesswork sold as fact.</Text>

        <SectionTitle>Live now</SectionTitle>
        {LIVE.map((g) => (
          <Pressable key={g.t} style={st.row} onPress={() => Linking.openURL(g.url)}>
            <View style={{ flex: 1 }}>
              <Text style={st.rowTitle}>{g.t}</Text>
              <Text style={st.rowDesc}>{g.d}</Text>
            </View>
            <View style={[st.chip, st.chipLive]}>
              <Text style={[st.chipText, { color: C.cyan }]}>Live</Text>
            </View>
          </Pressable>
        ))}

        <SectionTitle>Day one</SectionTitle>
        {DAY_ONE.map((g) => (
          <View key={g.t} style={[st.row, { opacity: 0.75 }]}>
            <View style={{ flex: 1 }}>
              <Text style={st.rowTitle}>{g.t}</Text>
              <Text style={st.rowDesc}>{g.d}</Text>
            </View>
            <View style={[st.chip, st.chipSoon]}>
              <Text style={[st.chipText, { color: C.gold }]}>With the game</Text>
            </View>
          </View>
        ))}

        <Text style={st.note}>
          Guides publish the day there is a game to guide: 19 November. Until then, the desk
          only ships what is confirmed.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  wrap: { padding: 18, paddingBottom: 40 },
  h1: { color: C.text, fontSize: 30, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 },
  sub: { color: C.dim, marginTop: 4, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.bg2, borderColor: C.line, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 8 },
  rowTitle: { color: C.text, fontWeight: '800', fontSize: 14 },
  rowDesc: { color: C.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  chipLive: { borderColor: C.cyan, backgroundColor: 'rgba(31,229,214,0.08)' },
  chipSoon: { borderColor: C.gold, backgroundColor: 'rgba(255,200,61,0.08)' },
  chipText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  note: { color: C.dim, lineHeight: 19, fontSize: 12, marginTop: 18 },
});
