import { useQuery } from 'convex/react';

import { api } from '@convex/_generated/api';
import { EmptyState } from '@/components/empty-state';
import { MediaCard } from '@/components/media-card';
import { MediaGrid } from '@/components/media-grid';
import { Screen } from '@/components/screen';
import { Text } from '@/components/ui/text';
import { useLayout } from '@/hooks/use-layout';

export default function ExploreScreen() {
  const templates = useQuery(api.templates.list, {});
  const { gutter } = useLayout();
  return (
    <Screen>
      <Text variant="body" tone="secondary" style={{ paddingHorizontal: gutter }}>
        Curated UGC videos. Open one to make your own version with a different creator or your product.
      </Text>
      <MediaGrid
        data={templates}
        keyOf={(x) => x._id}
        empty={<EmptyState icon="explore" title="Inspiration is on its way" />}
        renderItem={(x, width) => (
          <MediaCard
            testID={`template-${x._id}`}
            href={`/template/${x._id}`}
            width={width}
            posterUrl={x.posterUrl}
            status="completed"
            title={x.title}
            subtitle={`${x.avatar?.name ?? 'AI creator'} · ${x.duration}s`}
          />
        )}
      />
    </Screen>
  );
}
