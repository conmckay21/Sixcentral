import { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';

type Clip = {
  id: string;
  video_id: string;
  caption: string | null;
  votes: number;
  profiles: { handle: string } | null;
};

export default function Clips() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase
      .from('clip_submissions')
      .select('id, video_id, caption, votes, profiles!clip_submissions_profile_id_fkey(handle)')
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

  return (
    <SafeAreaView style={st.safe}>
      <View style={st.wrap}>
        <Text style={st.h1}>Clips</Text>
        <Text style={st.sub}>Top of the community feed. Voting, sharing and console intake land here in Phase 2.</Text>
        <FlatList
          data={clips}
          keyExtractor={(c) => c.id}
          ListEmptyComponent={
            <Text style={st.muted}>{loaded ? 'The feed opens with the game. First featured clip is up for grabs on launch night.' : 'Loading…'}</Text>
          }
          renderItem={({ item }) => (
            <View style={st.card}>
              <Image source={{ uri: `https://i.ytimg.com/vi/${item.video_id}/mqdefault.jpg` }} style={st.thumb} />
              <View style={st.meta}>
                {item.caption ? <Text style={st.cap}>{item.caption}</Text> : null}
                <Text style={st.by}>
                  @{item.profiles?.handle ?? 'unknown'} · {item.votes >= 0 ? '▲' : '▼'} {item.votes}
                </Text>
              </View>
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
  h1: { color: C.text, fontSize: 30, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 },
  sub: { color: C.muted, marginTop: 6, marginBottom: 16, lineHeight: 20 },
  card: { backgroundColor: C.bg2, borderColor: C.line, borderWidth: 1, borderRadius: 14, overflow: 'hidden', marginBottom: 14 },
  thumb: { width: '100%', aspectRatio: 16 / 9 },
  meta: { padding: 12 },
  cap: { color: C.text, fontWeight: '600', marginBottom: 4 },
  by: { color: C.dim, fontSize: 12 },
  muted: { color: C.muted },
});
