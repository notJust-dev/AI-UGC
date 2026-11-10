import { useQuery } from 'convex/react';
import { router } from 'expo-router';

import { api } from '@convex/_generated/api';
import { EmptyState } from '@/components/empty-state';
import { MediaCard } from '@/components/media-card';
import { MediaGrid } from '@/components/media-grid';
import { Screen } from '@/components/screen';
import { useComposer } from '@/hooks/use-composer';

export default function LibraryScreen() {
  const videos = useQuery(api.videos.listMine, { limit: 200 });
  const { reset } = useComposer();
  return (
    <Screen>
      <MediaGrid
        data={videos}
        keyOf={(v) => v._id}
        empty={
          <EmptyState
            icon="library"
            title="Your library is empty"
            message="Generate your first video and it will appear here."
            action="Generate video"
            onAction={() => {
              reset();
              router.push('/create');
            }}
          />
        }
        renderItem={(v, width) => (
          <MediaCard
            testID={`video-${v._id}`}
            href={`/video/${v._id}`}
            width={width}
            posterUrl={v.posterUrl}
            status={v.status}
            title={v.prompt}
            subtitle={`${v.modelName} · ${v.duration}s`}
          />
        )}
      />
    </Screen>
  );
}
