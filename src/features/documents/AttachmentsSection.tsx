import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import type { DocumentAttachment, DocumentRecord } from '@/core/finance';
import { useDataQuery, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import { Button, Dialog, Icon, IconButton, Section, Text } from '@/ui/components';
import { radius, spacing, useTheme } from '@/ui/theme';

import {
  AttachmentError,
  attachmentLink,
  attachmentUri,
  isImage,
  type AttachmentErrorCode,
  type PickedFile,
} from './attachments';
import { pickAttachment, type PickSource } from './pick-attachment';

const ERROR_KEYS = {
  type: 'documents.form.errorType',
  size: 'documents.form.errorSize',
  limit: 'documents.form.errorLimit',
  offline: 'documents.form.errorOffline',
  failed: 'documents.form.errorFailed',
  denied: 'documents.form.errorDenied',
  open: 'documents.form.errorOpen',
} as const satisfies Record<AttachmentErrorCode | 'denied' | 'open', string>;

type Props = {
  /** Documento já guardado; num documento novo, os ficheiros ficam à espera de o gravar. */
  document: DocumentRecord | null;
  /** Ficheiros escolhidos num documento ainda por gravar. */
  pending: readonly PickedFile[];
  onPick: (file: PickedFile) => Promise<void>;
  onRemovePending: (index: number) => void;
  onRemove: (attachment: DocumentAttachment) => Promise<void>;
};

/** Anexos de um documento (ADR-056): fotografias e PDFs. */
export function AttachmentsSection({
  document,
  pending,
  onPick,
  onRemovePending,
  onRemove,
}: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<PickSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<{ name: string; uri: string } | null>(null);
  const [removing, setRemoving] = useState<DocumentAttachment | null>(null);
  const uploads = useDataQuery(
    useCallback((repositories: Repositories) => repositories.attachmentUploads.pending(), []),
  );
  const notSent = new Set((uploads.data ?? []).map((upload) => upload.attachmentId));
  const attachments = document?.attachments ?? [];
  const count = attachments.length + pending.length;

  async function pick(source: PickSource) {
    setError(null);
    setBusy(source);
    try {
      const file = await pickAttachment(source);
      if (file === 'denied') setError(t(ERROR_KEYS.denied));
      else if (file) await onPick(file);
    } catch (cause) {
      setError(t(ERROR_KEYS[cause instanceof AttachmentError ? cause.code : 'failed']));
    } finally {
      setBusy(null);
    }
  }

  async function open(attachment: DocumentAttachment) {
    if (!document) return;
    setError(null);
    if (isImage(attachment)) {
      const uri = await attachmentUri(document, attachment);
      if (uri) setViewing({ name: attachment.name, uri });
      else setError(t(ERROR_KEYS.open));
      return;
    }
    const link = await attachmentLink(document, attachment);
    if (link) await Linking.openURL(link);
    else setError(t(ERROR_KEYS.open));
  }

  return (
    <Section title={t('documents.form.attachments')}>
      <View style={styles.list}>
        {attachments.map((attachment) => (
          <AttachmentRow
            key={attachment.id}
            document={document!}
            attachment={attachment}
            pendingUpload={notSent.has(attachment.id)}
            onOpen={() => void open(attachment)}
            onRemove={() => setRemoving(attachment)}
          />
        ))}
        {pending.map((file, index) => (
          <PendingRow
            key={`${file.uri}-${index}`}
            file={file}
            onRemove={() => onRemovePending(index)}
          />
        ))}
        <Text variant="footnote" tone="tertiary">
          {t('documents.form.attachmentsHint')}
        </Text>
        <View style={styles.buttons}>
          {Platform.OS !== 'web' ? (
            <Button
              label={t('documents.form.camera')}
              icon="camera-outline"
              variant="secondary"
              size="sm"
              disabled={count >= 10}
              loading={busy === 'camera'}
              onPress={() => void pick('camera')}
            />
          ) : null}
          <Button
            label={t('documents.form.library')}
            icon="images-outline"
            variant="secondary"
            size="sm"
            disabled={count >= 10}
            loading={busy === 'library'}
            onPress={() => void pick('library')}
          />
          <Button
            label={t('documents.form.files')}
            icon="document-attach-outline"
            variant="secondary"
            size="sm"
            disabled={count >= 10}
            loading={busy === 'files'}
            onPress={() => void pick('files')}
          />
        </View>
        {error ? (
          <Text variant="footnote" tone="negative" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
      </View>
      <Dialog
        visible={viewing !== null}
        title={viewing?.name ?? ''}
        onDismiss={() => setViewing(null)}
        actions={[
          {
            label: t('documents.form.close'),
            variant: 'secondary',
            onPress: () => setViewing(null),
          },
        ]}>
        {viewing ? (
          <Image
            source={{ uri: viewing.uri }}
            style={styles.preview}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        ) : null}
      </Dialog>
      <Dialog
        visible={removing !== null}
        title={t('documents.form.removeTitle')}
        message={t('documents.form.removeMessage')}
        onDismiss={() => setRemoving(null)}
        actions={[
          {
            label: t('documents.form.remove'),
            variant: 'destructive',
            onPress: () => {
              const target = removing;
              setRemoving(null);
              if (target) void onRemove(target).catch(() => setError(t(ERROR_KEYS.failed)));
            },
          },
          { label: t('common.cancel'), variant: 'ghost', onPress: () => setRemoving(null) },
        ]}
      />
    </Section>
  );
}

function AttachmentRow({
  document,
  attachment,
  pendingUpload,
  onOpen,
  onRemove,
}: {
  document: DocumentRecord;
  attachment: DocumentAttachment;
  pendingUpload: boolean;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  useEffect(() => {
    if (!isImage(attachment)) return;
    let active = true;
    void attachmentUri(document, attachment).then((uri) => {
      if (active) setThumbnail(uri);
    });
    return () => {
      active = false;
    };
  }, [document, attachment]);

  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Pressable
        style={styles.rowMain}
        accessibilityRole="button"
        accessibilityLabel={t('documents.form.open', { name: attachment.name })}
        onPress={onOpen}>
        <View style={[styles.thumb, { backgroundColor: colors.surfaceMuted }]}>
          {thumbnail ? (
            <Image source={{ uri: thumbnail }} style={styles.thumbImage} />
          ) : (
            <Icon
              name={isImage(attachment) ? 'image-outline' : 'document-text-outline'}
              size={22}
              color="textSecondary"
            />
          )}
        </View>
        <View style={styles.rowText}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {attachment.name}
          </Text>
          <Text variant="footnote" tone="secondary">
            <FileSize bytes={attachment.size} />
            {pendingUpload ? ` · ${t('documents.form.pending')}` : ''}
          </Text>
        </View>
      </Pressable>
      <IconButton
        icon="trash-outline"
        accessibilityLabel={t('documents.form.remove')}
        onPress={onRemove}
      />
    </View>
  );
}

function PendingRow({ file, onRemove }: { file: PickedFile; onRemove: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.rowMain}>
        <View style={[styles.thumb, { backgroundColor: colors.surfaceMuted }]}>
          {file.mime.startsWith('image/') ? (
            <Image source={{ uri: file.uri }} style={styles.thumbImage} />
          ) : (
            <Icon name="document-text-outline" size={22} color="textSecondary" />
          )}
        </View>
        <View style={styles.rowText}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {file.name}
          </Text>
          {file.size ? (
            <Text variant="footnote" tone="secondary">
              <FileSize bytes={file.size} />
            </Text>
          ) : null}
        </View>
      </View>
      <IconButton icon="close" accessibilityLabel={t('documents.form.remove')} onPress={onRemove} />
    </View>
  );
}

/** "182 KB", "2,4 MB". */
function FileSize({ bytes }: { bytes: number }) {
  const { formatDecimal } = useLocaleFormat();
  if (bytes < 1024 * 1024)
    return <>{`${formatDecimal(Math.max(1, Math.round(bytes / 1024)), 0)} KB`}</>;
  return <>{`${formatDecimal(bytes / (1024 * 1024), 1)} MB`}</>;
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingRight: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    minHeight: 64,
  },
  rowText: { flex: 1, gap: 2 },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: { width: 48, height: 48 },
  preview: { width: '100%', height: 420 },
});
