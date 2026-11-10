import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Rounded 9:16 player; shows the poster (and optional overlay) until a video URL exists. */
export function VideoPlayer({
  url,
  posterUrl,
  width,
  overlay,
}: {
  url: string | null;
  posterUrl: string | null;
  width: number;
  overlay?: ReactNode;
}) {
  const t = useTheme();
  const height = (width * 16) / 9;
  return (
    <View style={[styles.frame, { width, height, backgroundColor: t.surfaceMuted }]}>
      {url ? (
        <Player key={url} url={url} />
      ) : posterUrl ? (
        <Image source={posterUrl} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : null}
      {overlay ? <View style={[StyleSheet.absoluteFill, styles.overlay]}>{overlay}</View> : null}
    </View>
  );
}

function Player({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls
      allowsPictureInPicture
      crossOrigin="anonymous"
      playsInline
    />
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: Radius.xl, overflow: 'hidden', borderCurve: 'continuous', alignSelf: 'center' },
  overlay: { alignItems: 'center', justifyContent: 'center' },
});
