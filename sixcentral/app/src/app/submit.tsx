import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import type { Session } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';

const LICENCE =
  'You keep ownership. It is your clip, always. You let SixCentral feature it on the site, in the app and in weekly best of compilations. We credit you and link your channel wherever it appears. Ask us to remove it any time.';

const CATEGORIES = [
  ['gameplay', 'Gameplay'],
  ['funny', 'Funny'],
  ['stunt', 'Stunt'],
  ['discovery', 'Discovery'],
] as const;

function parseYoutubeId(input: string): string | null {
  const m = input.match(/(?:youtu\.be\/|v=|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  const bare = input.trim();
  return /^[A-Za-z0-9_-]{11}$/.test(bare) ? bare : null;
}

export default function Submit() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [route, setRoute] = useState<'link' | 'file'>('link');
  const [link, setLink] = useState('');
  const [file, setFile] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('gameplay');
  const [comp, setComp] = useState(true);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('');
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
  }, []);

  async function pickVideo() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1 });
    if (!res.canceled && res.assets[0]) setFile(res.assets[0]);
  }

  function fail(m: string) {
    setMsg(m);
    setBusy(false);
    setPhase('');
  }

  async function submit() {
    if (busy || !session) return;
    setMsg('');
    if (!agree) return fail('Tick the licence box and you are good to go.');
    setBusy(true);

    if (route === 'link') {
      const id = parseYoutubeId(link);
      if (!id) {
        return fail('That does not look like a YouTube link. Any video or Short works: watch URL, share link or Shorts link.');
      }
      const { error } = await supabase.from('clip_submissions').insert({
        profile_id: session.user.id,
        source: 'youtube',
        video_id: id,
        caption: caption.trim() || null,
        category,
        comp_entry: comp,
        terms_version: 'v1-app',
        agreed_at: new Date().toISOString(),
      });
      if (error) return fail('Could not submit. If you already sent this clip, it only counts once.');
      setBusy(false);
      setDone(true);
      return;
    }

    // upload route
    if (!file) return fail('Pick a video first.');
    if (file.fileSize && file.fileSize > 100 * 1024 * 1024) {
      return fail('Keep it under 100MB for now. Trim the clip and try again.');
    }
    setPhase('Uploading your video…');
    const ext = (file.fileName ?? file.uri).toLowerCase().endsWith('.mov') ? 'mov' : 'mp4';
    const path = `${session.user.id}/${Math.random().toString(36).slice(2)}-${Date.now()}.${ext}`;
    // Signed URL + native upload streams the file straight from disk: no memory
    // ceiling, and none of the React Native blob serialisation traps.
    const { data: signed, error: signErr } = await supabase.storage
      .from('clip-intake')
      .createSignedUploadUrl(path);
    if (signErr || !signed) return fail('Could not start the upload. Try again.');
    const up = await FileSystem.uploadAsync(signed.signedUrl, file.uri, {
      httpMethod: 'PUT',
      headers: { 'Content-Type': file.mimeType ?? 'video/mp4' },
    }).catch(() => null);
    if (!up || up.status < 200 || up.status >= 300) {
      const why = up ? `status ${up.status}: ${String(up.body ?? '').slice(0, 140)}` : 'network';
      return fail(`Upload failed (${why}). Check the connection and try again.`);
    }
    const { data: intake, error: inErr } = await supabase
      .from('clip_intake')
      .insert({
        profile_id: session.user.id,
        storage_path: path,
        caption: caption.trim() || null,
        category,
        comp_entry: comp,
        terms_version: 'v1-app',
        agreed_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (inErr || !intake) return fail('Could not queue the upload. Try again.');
    setPhase('Posting it to YouTube for you. Keep this screen open, it can take a couple of minutes…');
    const res = await fetch('https://sixcentral.co.uk/api/clips/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intakeId: intake.id }),
    }).catch(() => null);
    setPhase('');
    setBusy(false);
    if (res?.ok) {
      setDone(true);
    } else {
      const body = res ? ((await res.json().catch(() => null)) as { error?: string } | null) : null;
      setMsg(body?.error ?? 'Processing hiccuped. Your upload is safe, a moderator can retry it.');
    }
  }

  if (!session) {
    return (
      <SafeAreaView style={st.safe}>
        <View style={st.wrap}>
          <Pressable onPress={() => router.back()}>
            <Text style={st.back}>✕ Close</Text>
          </Pressable>
          <Text style={st.h1}>Get on the feed</Text>
          <Text style={st.muted}>Sign in on the Profile tab first. Same account as the website.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (done) {
    return (
      <SafeAreaView style={st.safe}>
        <View style={st.wrap}>
          <Text style={st.kicker}>Submitted</Text>
          <Text style={st.h1}>In the queue ✓</Text>
          <Text style={st.muted}>
            A moderator checks it. Once approved it joins the feed and 50 Respect lands on your
            profile.
          </Text>
          <Pressable style={st.btn} onPress={() => router.back()}>
            <Text style={st.btnText}>Back to the feed</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.safe}>
      <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()}>
          <Text style={st.back}>✕ Close</Text>
        </Pressable>
        <Text style={st.kicker}>Submit a clip</Text>
        <Text style={st.h1}>Get on the feed</Text>

        <View style={st.toggle}>
          <Pressable style={[st.toggleBtn, route === 'link' && st.toggleOn]} onPress={() => setRoute('link')}>
            <Text style={[st.toggleText, route === 'link' && st.toggleTextOn]}>Paste a link</Text>
          </Pressable>
          <Pressable style={[st.toggleBtn, route === 'file' && st.toggleOn]} onPress={() => setRoute('file')}>
            <Text style={[st.toggleText, route === 'file' && st.toggleTextOn]}>Upload a video</Text>
          </Pressable>
        </View>

        {route === 'link' ? (
          <>
            <Text style={st.help}>Any YouTube link works: full videos, Shorts, share links, the lot.</Text>
            <Text style={st.label}>YouTube link</Text>
            <TextInput
              style={st.input}
              placeholder="https://youtu.be/…"
              placeholderTextColor={C.dim}
              autoCapitalize="none"
              value={link}
              onChangeText={setLink}
            />
          </>
        ) : (
          <>
            <Text style={st.help}>
              No YouTube account needed. Save the clip to your phone from the PlayStation or Xbox
              app, pick it here, and we post it to YouTube for you with your credit. Up to 100MB.
            </Text>
            <Pressable style={st.pick} onPress={pickVideo}>
              <Text style={st.pickText}>{file ? '🎬 Change video' : '🎬 Choose a video'}</Text>
            </Pressable>
            {file && (
              <Text style={st.fileMeta}>
                {(file.fileName ?? 'video').slice(0, 34)}
                {file.fileSize ? ` · ${(file.fileSize / (1024 * 1024)).toFixed(1)}MB` : ''}
              </Text>
            )}
          </>
        )}

        <Text style={st.label}>Caption</Text>
        <TextInput
          style={st.input}
          placeholder="Rooftop chase gone perfectly wrong"
          placeholderTextColor={C.dim}
          value={caption}
          onChangeText={setCaption}
        />

        <Text style={st.label}>Category</Text>
        <View style={st.catRow}>
          {CATEGORIES.map(([key, label]) => (
            <Pressable key={key} style={[st.cat, category === key && st.catOn]} onPress={() => setCategory(key)}>
              <Text style={[st.catText, category === key && st.catTextOn]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={st.checkRow} onPress={() => setComp(!comp)}>
          <View style={[st.check, comp && st.checkOn]}>{comp && <Text style={st.checkTick}>✓</Text>}</View>
          <Text style={st.checkLabel}>Enter Clip of the Month. Community votes, winner takes free Premium.</Text>
        </Pressable>

        <View style={st.licence}>
          <Text style={st.licenceKicker}>The clip licence, in plain English</Text>
          <Text style={st.licenceBody}>{LICENCE}</Text>
        </View>

        <Pressable style={st.checkRow} onPress={() => setAgree(!agree)}>
          <View style={[st.check, agree && st.checkOn]}>{agree && <Text style={st.checkTick}>✓</Text>}</View>
          <Text style={st.checkLabel}>I agree to the Clip Licence above.</Text>
        </Pressable>

        {phase ? <Text style={st.phase}>{phase}</Text> : null}
        {msg ? <Text style={st.err}>{msg}</Text> : null}

        <Pressable style={[st.btn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
          <Text style={st.btnText}>{busy ? 'Working…' : route === 'link' ? 'Submit for review' : 'Upload for review'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  wrap: { padding: 20, paddingBottom: 44 },
  back: { color: C.dim, fontWeight: '800', marginBottom: 14, fontSize: 13 },
  kicker: { color: C.cyan, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 },
  h1: { color: C.text, fontSize: 28, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14 },
  toggle: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  toggleBtn: { borderColor: C.line2, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  toggleOn: { backgroundColor: C.pink, borderColor: C.pink },
  toggleText: { color: C.muted, fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  toggleTextOn: { color: '#fff' },
  help: { color: C.muted, lineHeight: 20, marginBottom: 14, fontSize: 13 },
  label: { color: C.dim, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: C.bg2, borderColor: C.line2, borderWidth: 1, borderRadius: 12, color: C.text, padding: 13, marginBottom: 8 },
  pick: { borderColor: C.pink, borderWidth: 1, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 8 },
  pickText: { color: C.pinkL, fontWeight: '800', fontSize: 13 },
  fileMeta: { color: C.dim, fontSize: 12, marginBottom: 6 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  cat: { borderColor: C.line2, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  catOn: { backgroundColor: C.cyan, borderColor: C.cyan },
  catText: { color: C.muted, fontWeight: '700', fontSize: 12 },
  catTextOn: { color: '#06201D' },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 10 },
  check: { width: 22, height: 22, borderRadius: 6, borderColor: C.line2, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkOn: { backgroundColor: C.pink, borderColor: C.pink },
  checkTick: { color: '#fff', fontWeight: '900', fontSize: 13 },
  checkLabel: { color: C.muted, flex: 1, lineHeight: 19, fontSize: 13 },
  licence: { borderColor: C.line2, borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 14 },
  licenceKicker: { color: C.cyan, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 },
  licenceBody: { color: C.muted, lineHeight: 19, fontSize: 13 },
  phase: { color: C.gold, marginTop: 12, lineHeight: 19, fontSize: 13 },
  err: { color: C.pinkL, marginTop: 12, lineHeight: 19, fontSize: 13 },
  btn: { backgroundColor: C.pink, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 16 },
  btnText: { color: '#fff', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  muted: { color: C.muted, lineHeight: 20 },
});
