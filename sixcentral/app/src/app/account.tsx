import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { C, G, GRAD } from '@/lib/theme';
import { flairColor } from '@/lib/flairs';
import Avatar from '@/components/Avatar';

const PRESETS = ['vi', 'skyline', 'palms', 'cassette', 'disc', 'controller'] as const;
type Flair = { key: string; label: string; min_rank_id: number };

export default function Account() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [flair, setFlair] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [platform, setPlatform] = useState<string | null>(null);
  const [psn, setPsn] = useState('');
  const [xbox, setXbox] = useState('');
  const [idsPublic, setIdsPublic] = useState(false);
  const [dob, setDob] = useState<string | null>(null);
  const [dd, setDd] = useState('');
  const [mm, setMm] = useState('');
  const [yyyy, setYyyy] = useState('');
  const [savingDob, setSavingDob] = useState(false);
  const [rankId, setRankId] = useState(0);
  const [isStaff, setIsStaff] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [handle, setHandle] = useState('');
  const [flairs, setFlairs] = useState<Flair[]>([]);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (!data.session) {
        setReady(true);
        return;
      }
      const [{ data: p }, { data: f }] = await Promise.all([
        supabase
          .from('public_profiles')
          .select('handle, avatar_url, flair, bio, platform, psn_id, xbox_gamertag, ids_public, rank_id, is_staff, is_pro, date_of_birth')
          .eq('id', data.session.user.id)
          .single(),
        supabase.from('flairs').select('key, label, min_rank_id').order('min_rank_id'),
      ]);
      if (p) {
        setHandle(p.handle as string);
        setAvatarUrl(p.avatar_url as string | null);
        setFlair(p.flair as string | null);
        setBio((p.bio as string | null) ?? '');
        setPlatform(p.platform as string | null);
        setPsn((p.psn_id as string | null) ?? '');
        setXbox((p.xbox_gamertag as string | null) ?? '');
        setIdsPublic(!!p.ids_public);
        setDob((p.date_of_birth as string | null) ?? null);
        setRankId(p.rank_id as number);
        setIsStaff(!!p.is_staff);
        setIsPro(!!p.is_pro);
      }
      if (f) setFlairs(f as Flair[]);
      setReady(true);
    });
  }, []);

  function flash(good: boolean, text: string) {
    if (good) {
      setOk(text);
      setMsg('');
      setTimeout(() => setOk(''), 2200);
    } else {
      setMsg(text);
      setOk('');
    }
  }

  async function setAvatar(url: string) {
    if (!session) return;
    setAvatarUrl(url);
    const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', session.user.id);
    flash(!error, error ? 'Could not save the avatar. Try again.' : 'Avatar saved ✓');
  }

  async function pickPhoto() {
    if (!session) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    if (a.fileSize && a.fileSize > 2 * 1024 * 1024) return flash(false, 'Keep photos under 2MB.');
    const bytes = await fetch(a.uri).then((r) => r.arrayBuffer()).catch(() => null);
    if (!bytes) return flash(false, 'Could not read that photo.');
    const path = `${session.user.id}/avatar-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from('avatars').upload(path, bytes, { contentType: 'image/jpeg' });
    if (error) return flash(false, 'Upload failed. Try again.');
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    await setAvatar(data.publicUrl);
  }

  async function chooseFlair(f: Flair) {
    if (!session) return;
    const locked = !isStaff && rankId < f.min_rank_id;
    if (locked) return flash(false, `${f.label} unlocks at rank ${f.min_rank_id}. Keep climbing.`);
    setFlair(f.key);
    const { error } = await supabase.from('profiles').update({ flair: f.key }).eq('id', session.user.id);
    flash(!error, error ? 'That flair is still locked for you.' : `${f.label} equipped ✓`);
  }

  function ageFrom(iso: string): number {
    const [y, m, day] = iso.split('-').map(Number);
    const t = new Date();
    let age = t.getFullYear() - y;
    if (t.getMonth() + 1 < m || (t.getMonth() + 1 === m && t.getDate() < day)) age -= 1;
    return age;
  }

  function prettyDob(iso: string): string {
    const [y, m, day] = iso.split('-').map(Number);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${day} ${months[m - 1]} ${y}`;
  }

  async function saveDob() {
    if (!session || savingDob) return;
    const day = parseInt(dd, 10);
    const mon = parseInt(mm, 10);
    const yr = parseInt(yyyy, 10);
    if (!day || !mon || !yr || yyyy.length !== 4) return flash(false, 'Enter your date of birth as DD MM YYYY.');
    const test = new Date(Date.UTC(yr, mon - 1, day));
    if (test.getUTCFullYear() !== yr || test.getUTCMonth() !== mon - 1 || test.getUTCDate() !== day) {
      return flash(false, 'That date does not exist. Check it and try again.');
    }
    if (yr < 1900 || test.getTime() > Date.now()) return flash(false, 'That date does not look right.');
    const iso = `${yr}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (ageFrom(iso) < 13) return flash(false, 'SixCentral is for ages 13 and up.');
    setSavingDob(true);
    const { error } = await supabase.from('profiles').update({ date_of_birth: iso }).eq('id', session.user.id);
    setSavingDob(false);
    if (error) {
      flash(false, error.message.includes('DOB_LOCKED') ? 'Your date of birth is already set. Contact support to change it.' : 'Could not save. Try again.');
      return;
    }
    setDob(iso);
    flash(true, ageFrom(iso) >= 18 ? 'Date of birth saved ✓ Public gamer IDs unlocked.' : 'Date of birth saved ✓ Public gamer IDs unlock at 18.');
  }

  async function save() {
    if (!session || saving) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        bio: bio.trim() || null,
        platform,
        psn_id: psn.trim() || null,
        xbox_gamertag: xbox.trim() || null,
        ids_public: idsPublic,
      })
      .eq('id', session.user.id);
    setSaving(false);
    if (error) {
      const dobGate = error.message.includes('IDS_AGE');
      flash(false, dobGate ? 'Public gamer IDs are an 18-plus feature. Add your date of birth above first.' : 'Could not save. Try again.');
      if (dobGate) setIdsPublic(false);
    } else {
      flash(true, 'Profile saved ✓');
    }
  }

  if (!ready) {
    return (
      <SafeAreaView style={st.safe}>
        <ActivityIndicator color={C.pink} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={st.safe}>
        <View style={st.pad}>
          <Pressable onPress={() => router.back()}>
            <Text style={st.close}>✕ Close</Text>
          </Pressable>
          <Text style={st.h1}>Your account</Text>
          <Text style={st.muted}>Sign in on the Profile tab first.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.safe}>
      <ScrollView contentContainerStyle={st.pad} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()}>
          <Text style={st.close}>✕ Close</Text>
        </Pressable>
        <Text style={st.kicker}>@{handle}</Text>
        <Text style={st.h1}>Your account</Text>

        <Text style={st.label}>Avatar</Text>
        <View style={st.avatarRow}>
          <Avatar url={avatarUrl} handle={handle} size={64} ring={flairColor(flair)} />
          <Pressable style={st.photoBtn} onPress={pickPhoto}>
            <Text style={st.photoBtnText}>📷 Choose a photo</Text>
          </Pressable>
        </View>
        <View style={st.presetRow}>
          {PRESETS.map((k) => (
            <Pressable key={k} onPress={() => setAvatar(`/avatars/preset-${k}.svg`)}>
              <Avatar url={`/avatars/preset-${k}.svg`} size={50} ring={avatarUrl === `/avatars/preset-${k}.svg` ? C.cyan : C.line2} />
            </Pressable>
          ))}
        </View>

        <Text style={st.label}>Flair</Text>
        <View style={st.flairRow}>
          {flairs.map((f) => {
            const locked = !isStaff && rankId < f.min_rank_id;
            const on = flair === f.key;
            return (
              <Pressable
                key={f.key}
                style={[st.flairChip, { borderColor: flairColor(f.key) }, on && { backgroundColor: 'rgba(255,255,255,0.08)' }, locked && { opacity: 0.4 }]}
                onPress={() => chooseFlair(f)}
              >
                <View style={[st.flairDot, { backgroundColor: flairColor(f.key) }]} />
                <Text style={st.flairText}>
                  {locked ? '🔒 ' : on ? '✓ ' : ''}
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={st.label}>Bio · {bio.length}/200</Text>
        <TextInput
          style={[st.input, { minHeight: 80, textAlignVertical: 'top' }]}
          multiline
          maxLength={200}
          placeholder="Day one. Chasing the platinum."
          placeholderTextColor={C.dim}
          value={bio}
          onChangeText={setBio}
        />

        <Text style={st.label}>Platform</Text>
        <View style={st.platRow}>
          {[
            ['ps5', 'PS5'],
            ['xbox', 'Xbox'],
          ].map(([key, lab]) => (
            <Pressable key={key} style={[st.plat, platform === key && st.platOn]} onPress={() => setPlatform(platform === key ? null : key)}>
              <Text style={[st.platText, platform === key && st.platTextOn]}>{lab}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={st.label}>PSN ID</Text>
        <TextInput style={st.input} maxLength={30} autoCapitalize="none" placeholder="Your PSN" placeholderTextColor={C.dim} value={psn} onChangeText={setPsn} />
        <Text style={st.label}>Xbox Gamertag</Text>
        <TextInput style={st.input} maxLength={30} autoCapitalize="none" placeholder="Your Gamertag" placeholderTextColor={C.dim} value={xbox} onChangeText={setXbox} />

        <Text style={st.label}>Date of birth</Text>
        {dob ? (
          <Text style={st.dobSet}>
            Born {prettyDob(dob)} · Locked. Contact support if this is wrong.
          </Text>
        ) : (
          <>
            <Text style={st.dobHint}>Needed once to unlock 18-plus features like public gamer IDs. Never shown to anyone.</Text>
            <View style={st.dobRow}>
              <TextInput style={[st.input, st.dobInput]} keyboardType="number-pad" maxLength={2} placeholder="DD" placeholderTextColor={C.dim} value={dd} onChangeText={setDd} />
              <TextInput style={[st.input, st.dobInput]} keyboardType="number-pad" maxLength={2} placeholder="MM" placeholderTextColor={C.dim} value={mm} onChangeText={setMm} />
              <TextInput style={[st.input, st.dobInputY]} keyboardType="number-pad" maxLength={4} placeholder="YYYY" placeholderTextColor={C.dim} value={yyyy} onChangeText={setYyyy} />
              <Pressable style={[st.dobBtn, savingDob && { opacity: 0.6 }]} onPress={saveDob} disabled={savingDob}>
                <Text style={st.dobBtnText}>{savingDob ? '…' : 'Save'}</Text>
              </Pressable>
            </View>
          </>
        )}

        <Pressable
          style={[st.checkRow, dob != null && ageFrom(dob) < 18 && { opacity: 0.45 }]}
          onPress={() => {
            if (!dob) return flash(false, 'Add your date of birth above first.');
            if (ageFrom(dob) < 18) return flash(false, 'Public gamer IDs unlock at 18.');
            setIdsPublic(!idsPublic);
          }}
        >
          <View style={[st.check, idsPublic && st.checkOn]}>{idsPublic && <Text style={st.checkTick}>✓</Text>}</View>
          <Text style={st.checkLabel}>Show my gamer IDs on my public profile. 18-plus feature.</Text>
        </Pressable>

        {ok ? <Text style={st.okText}>{ok}</Text> : null}
        {msg ? <Text style={st.err}>{msg}</Text> : null}

        <Pressable style={[st.btn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
          <Text style={st.btnText}>{saving ? 'Saving…' : 'Save profile'}</Text>
        </Pressable>

        <Text style={st.label}>SixCentral Pro</Text>
        {isPro ? (
          <View style={st.proActive}>
            <Text style={st.proActiveText}>PRO · Active</Text>
            <Text style={st.proActiveSub}>Full map, unlimited tracking, ad free. Yours.</Text>
          </View>
        ) : (
          <LinearGradient colors={G.hot} {...GRAD} style={st.proCard}>
            <View style={st.proShade} />
            <Text style={st.proTitle}>Full map. Unlimited tracking. Ad free.</Text>
            <Text style={st.proSub}>Landing with the game this November.</Text>
          </LinearGradient>
        )}

        <Text style={st.foot}>Password changes live on the website for now.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  pad: { padding: 20, paddingBottom: 48 },
  close: { color: C.dim, fontWeight: '800', marginBottom: 14, fontSize: 13 },
  kicker: { color: C.cyan, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 2 },
  h1: { color: C.text, fontSize: 28, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  label: { color: C.dim, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 20, marginBottom: 8 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  photoBtn: { borderColor: C.pink, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11 },
  photoBtnText: { color: C.pinkL, fontWeight: '800', fontSize: 12 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  flairRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  flairChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  flairDot: { width: 8, height: 8, borderRadius: 4 },
  flairText: { color: C.text, fontSize: 11, fontWeight: '700' },
  input: { backgroundColor: C.bg2, borderColor: C.line2, borderWidth: 1, borderRadius: 12, color: C.text, padding: 13 },
  platRow: { flexDirection: 'row', gap: 8 },
  plat: { borderColor: C.line2, borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  platOn: { backgroundColor: C.cyan, borderColor: C.cyan },
  platText: { color: C.muted, fontWeight: '800', fontSize: 12 },
  platTextOn: { color: '#06201D' },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 16 },
  check: { width: 22, height: 22, borderRadius: 6, borderColor: C.line2, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkOn: { backgroundColor: C.pink, borderColor: C.pink },
  checkTick: { color: '#fff', fontWeight: '900', fontSize: 13 },
  checkLabel: { color: C.muted, flex: 1, lineHeight: 19, fontSize: 13 },
  okText: { color: C.green, marginTop: 12, fontWeight: '700', fontSize: 13 },
  err: { color: C.pinkL, marginTop: 12, lineHeight: 19, fontSize: 13 },
  btn: { backgroundColor: C.pink, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 14 },
  btnText: { color: '#fff', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  proActive: { borderColor: C.gold, borderWidth: 1, borderRadius: 16, padding: 16, backgroundColor: 'rgba(255,200,61,0.07)' },
  proActiveText: { color: C.gold, fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  proActiveSub: { color: C.muted, marginTop: 4, fontSize: 12 },
  proCard: { borderRadius: 16, padding: 16, overflow: 'hidden' },
  proShade: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,8,16,0.4)' },
  proTitle: { color: '#fff', fontWeight: '900', fontSize: 16 },
  proSub: { color: 'rgba(255,255,255,0.85)', marginTop: 4, fontSize: 12, fontWeight: '600' },
  proBtn: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.16)', borderColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginTop: 12 },
  proBtnText: { color: '#fff', fontWeight: '800', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  dobHint: { color: C.dim, fontSize: 12, lineHeight: 17, marginBottom: 8 },
  dobSet: { color: C.muted, fontSize: 13, lineHeight: 19 },
  dobRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dobInput: { width: 58, textAlign: 'center' },
  dobInputY: { width: 78, textAlign: 'center' },
  dobBtn: { backgroundColor: C.cyan, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13 },
  dobBtnText: { color: '#06201D', fontWeight: '900', fontSize: 13 },
  foot: { color: C.dim, fontSize: 11, marginTop: 22, lineHeight: 16 },
  muted: { color: C.muted, lineHeight: 20 },
});
