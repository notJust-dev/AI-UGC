import { useMutation } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { api } from '@convex/_generated/api';
import { Field, Input } from '@/components/form';
import { PhotoPicker, type PhotoItem } from '@/components/photo-picker';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useComposer } from '@/hooks/use-composer';
import { useTheme } from '@/hooks/use-theme';
import { useUploadPhotos } from '@/hooks/use-upload-photos';
import { errorMessage } from '@/lib/errors';

export default function NewAvatarScreen() {
  const t = useTheme();
  const { select } = useLocalSearchParams<{ select?: string }>();
  const { update } = useComposer();
  const create = useMutation(api.avatars.create);
  const upload = useUploadPhotos();
  const [name, setName] = useState('');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  const valid = name.trim().length > 0 && photos.length > 0 && consent;

  const save = async () => {
    setSaving(true);
    try {
      const imageIds = await upload(photos);
      const id = await create({ name, imageIds, consent });
      if (select) {
        update({ avatarId: id });
        router.dismiss(2); // back to the composer, past the picker sheet
      } else {
        router.back();
      }
    } catch (e) {
      const msg = errorMessage(e, "Couldn't save the avatar.");
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Not saved', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: t.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <Text variant="body" tone="secondary">
        Upload 1–4 clear photos of the same person. Different angles and good light give the most
        consistent results. Your avatars are private to you.
      </Text>

      <Field label="Name">
        <Input
          testID="avatar-name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Me, Alex"
          maxLength={60}
          autoCorrect={false}
          autoCapitalize="words"
        />
      </Field>

      <Field label="Photos" hint="Face clearly visible, no sunglasses or heavy filters.">
        <PhotoPicker items={photos} onChange={setPhotos} />
      </Field>

      <Pressable
        testID="avatar-consent"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: consent }}
        onPress={() => setConsent((c) => !c)}
        style={[styles.consent, { backgroundColor: t.surface, borderColor: t.border }]}>
        <View
          style={[
            styles.box,
            { borderColor: consent ? t.accent : t.textTertiary, backgroundColor: consent ? t.accent : 'transparent' },
          ]}>
          {consent ? <Icon name="check" size={12} color={t.onAccent} /> : null}
        </View>
        <Text variant="callout" style={styles.flex}>
          These are photos of me, or I have this person’s permission to create AI videos with their
          likeness.
        </Text>
      </Pressable>

      <Button testID="avatar-save" title="Save avatar" size="lg" onPress={save} loading={saving} disabled={!valid} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.five, gap: Spacing.six, paddingBottom: Spacing.ten, width: '100%', maxWidth: 640, alignSelf: 'center' },
  consent: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-start',
  },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
});
