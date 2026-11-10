import { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet } from 'react-native';

import type { Id } from '@convex/_generated/dataModel';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useUploadPhotos } from '@/hooks/use-upload-photos';
import { errorMessage } from '@/lib/errors';

import { Field, Input } from './form';
import { PhotoPicker, type PhotoItem } from './photo-picker';
import { Button } from './ui/button';
import { Text } from './ui/text';

export type ProductDraft = { name: string; description: string; photos: PhotoItem[] };

export function ProductForm({
  initial,
  submitLabel,
  onSubmit,
  onDelete,
}: {
  initial?: ProductDraft;
  submitLabel: string;
  onSubmit: (v: { name: string; description: string; imageIds: Id<'_storage'>[] }) => Promise<void>;
  onDelete?: () => void;
}) {
  const t = useTheme();
  const upload = useUploadPhotos();
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [photos, setPhotos] = useState<PhotoItem[]>(initial?.photos ?? []);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const imageIds = await upload(photos);
      await onSubmit({ name, description, imageIds });
    } catch (e) {
      const msg = errorMessage(e, "Couldn't save the product.");
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Not saved', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: t.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <Text variant="body" tone="secondary">
        Save your product once and reuse it in any video. The description is used to write the
        script, and the photos keep the packaging accurate.
      </Text>
      <Field label="Name">
        <Input testID="product-name" value={name} onChangeText={setName} placeholder="e.g. GlowUp Vitamin C Serum" maxLength={60} />
      </Field>
      <Field label="Description" hint="What it is, who it's for, and the one benefit to highlight.">
        <Input
          testID="product-description"
          value={description}
          onChangeText={setDescription}
          placeholder="A lightweight vitamin C serum for dull skin. Absorbs in seconds, no sticky feel."
          multiline
          maxLength={600}
        />
      </Field>
      <Field label="Photos" hint="1–4 photos. Product clearly visible, label readable.">
        <PhotoPicker items={photos} onChange={setPhotos} />
      </Field>
      <Button
        testID="product-save"
        title={submitLabel}
        size="lg"
        loading={saving}
        disabled={!name.trim() || photos.length === 0}
        onPress={save}
      />
      {onDelete ? <Button title="Delete product" icon="trash" kind="danger" onPress={onDelete} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.five, gap: Spacing.six, paddingBottom: Spacing.ten, width: '100%', maxWidth: 640, alignSelf: 'center' },
});
