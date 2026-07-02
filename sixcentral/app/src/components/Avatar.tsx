import { Image, StyleSheet, Text, View } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { C } from '@/lib/theme';
import { absUrl } from '@/lib/site';

/**
 * The one avatar renderer: handles preset SVGs, uploaded photos and the
 * letter fallback, all wearing the flair ring.
 */
export default function Avatar({
  url,
  handle,
  size = 68,
  ring = C.pink,
}: {
  url: string | null | undefined;
  handle?: string | null;
  size?: number;
  ring?: string;
}) {
  const src = absUrl(url);
  const isSvg = !!src && src.toLowerCase().includes('.svg');
  const inner = size - 5;

  return (
    <View
      style={[
        st.ring,
        { width: size, height: size, borderRadius: size / 2, borderColor: ring, shadowColor: ring },
      ]}
    >
      {src ? (
        isSvg ? (
          <View style={{ width: inner, height: inner, borderRadius: inner / 2, overflow: 'hidden', backgroundColor: C.surface }}>
            <SvgUri uri={src} width={inner} height={inner} />
          </View>
        ) : (
          <Image source={{ uri: src }} style={{ width: inner, height: inner, borderRadius: inner / 2 }} />
        )
      ) : (
        <View style={[st.fallback, { width: inner, height: inner, borderRadius: inner / 2 }]}>
          <Text style={[st.letter, { color: ring, fontSize: size * 0.38 }]}>
            {handle?.slice(0, 1).toUpperCase() ?? '?'}
          </Text>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  ring: { borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.7, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 5, backgroundColor: C.bg },
  fallback: { backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  letter: { fontWeight: '900' },
});
