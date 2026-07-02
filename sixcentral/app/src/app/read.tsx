import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { C } from '@/lib/theme';

/** In-app reader for site pages without a native renderer yet. */
export default function Read() {
  const { url, title } = useLocalSearchParams<{ url: string; title?: string }>();
  const router = useRouter();
  return (
    <SafeAreaView style={st.safe}>
      <View style={st.bar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={st.back}>← Back</Text>
        </Pressable>
        <Text style={st.title} numberOfLines={1}>
          {title ?? 'SixCentral'}
        </Text>
      </View>
      <WebView
        source={{ uri: url ?? 'https://sixcentral.co.uk' }}
        style={{ backgroundColor: C.bg }}
        injectedJavaScript={"try{document.querySelector('.nav')?.remove();document.querySelector('.footer')?.remove();}catch(e){};true;"}
      />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 10, borderBottomColor: C.line, borderBottomWidth: 1 },
  back: { color: C.cyan, fontWeight: '800', fontSize: 13 },
  title: { color: C.text, fontWeight: '800', flex: 1, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
});
