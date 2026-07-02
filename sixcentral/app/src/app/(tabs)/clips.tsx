import { useEffect, useState } from 'react';
import { FlatList, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';

type Clip = {
  id: string;
  video_id: string;
  caption: string | null;
  votes: number;
  comp_entry: boolean;
  profiles: { handle: string; title: string | null; rank_id: number } | null;
};
type Rank = { id: number; name: string };

export default function Clips() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.from('ranks').select('id, name').order('id').then(({ data }) => {
      if (data) setRanks(data as Rank[]);
    });
    supabase
      .from('clip_submissions')
      .select('id, video_id, caption, votes, comp_entry, profiles!clip_submissions_profile_id_fkey(handle, title, rank_id)')
      .eq('status', 'approved')
      .gt('votes', -3)
      .order('votes', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setClips(data as unknown as Clip[]);
        setLoaded(true);
      });
  }, []);

  const rankName = (id: number) => ranks.find((r) => r.id === id)?.name ?? '';

  return (
    <SafeAreaView style={st.safe}>
      <FlatList
        data={clips}
        keyExtractor={(c) => c.id}
        contentContainerStyle={st.wrap}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={st.head}>
            <Text style={st.h1}>Clips</Text>
            <Text style={st.sub}>For you · merit ranked, human checked</Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={st.muted}>
            {loaded ? 'The feed opens with the game. First featured clip is up for grabs on launch night.' : 'Loading…'}
          </Text>
        }
        renderItem={({ item }) => {
          const p = item.profiles;
          return (
            <Pressable style={st.card} onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${item.video_id}`)}>
              <Image source={{ uri: `https://i.ytimg.com/vi/${item.video_id}/hqdefault.jpg` }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <LinearGradient colors={['transparent', 'rgba(11,8,16,0.92)']} style={st.shade} />
              <View style={st.play}>
                <Text style={st.playText}>▶</Text>
              </View>

              <View style={st.rail}>
                <View style={st.railBtn}>
                  <Text style={st.railIcon}>▲</Text>
                  <Text style={st.railCount}>{item.votes}</Text>
                </View>
                <View style={st.railBtn}>
                  <Text style={st.railIcon}>💬</Text>
                  <Text style={st.railCount}>—</Text>
                </View>
                <View style={st.railBtn}>
                  <Text style={st.railIcon}>↗</Text>
                  <Text style={st.railCount}>Share</Text>
                </View>
              </View>

              <View style={st.info}>
                {item.comp_entry && (
                  <View style={st.compTag}>
                    <Text style={st.compTagText}>🏆 Clip of the Month entry</Text>
                  </View>
                )}
                <View style={st.creator}>
                  <View style={st.av}>
                    <Text style={st.avText}>{p?.handle?.slice(0, 2).toUpperCase() ?? '??'}</Text>
                  </View>
                  <View>
                    <Text style={st.cn}>@{p?.handle ?? 'unknown'}</Text>
                    <Text style={st.cr}>{p ? (p.title ?? rankName(p.rank_id)) : ''}</Text>
                  </View>
                </View>
                {item.caption ? <Text style={st.cap} numberOfLines={2}>{item.caption}</Text> : null}
                <Text style={st.snd}>♪ original audio · gameplay clip</Text>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  wrap: { padding: 18, paddingBottom: 40 },
  head: { marginBottom: 14 },
  h1: { color: C.text, fontSize: 30, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 },
  sub: { color: C.dim, marginTop: 4, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  card: { height: 440, borderRadius: 18, overflow: 'hidden', marginBottom: 18, backgroundColor: C.surface },
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 240 },
  play: { position: 'absolute', top: '38%', alignSelf: 'center', width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(11,8,16,0.55)', alignItems: 'center', justifyContent: 'center', borderColor: 'rgba(255,255,255,0.35)', borderWidth: 1 },
  playText: { color: '#fff', fontSize: 18, marginLeft: 3 },
  rail: { position: 'absolute', right: 12, bottom: 96, alignItems: 'center', gap: 14 },
  railBtn: { alignItems: 'center' },
  railIcon: { fontSize: 20, color: '#fff' },
  railCount: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700', marginTop: 2 },
  info: { position: 'absolute', left: 14, right: 66, bottom: 14 },
  compTag: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,200,61,0.18)', borderColor: C.gold, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  compTagText: { color: C.gold, fontSize: 10, fontWeight: '800' },
  creator: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  av: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.surface, borderColor: C.pink, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  avText: { color: C.pink, fontWeight: '900', fontSize: 12 },
  cn: { color: '#fff', fontWeight: '800', fontSize: 13 },
  cr: { color: C.gold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  cap: { color: 'rgba(255,255,255,0.92)', fontSize: 13, lineHeight: 18 },
  snd: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 5 },
  muted: { color: C.muted, lineHeight: 20 },
});
