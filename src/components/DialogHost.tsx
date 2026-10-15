import React, {useEffect, useState} from 'react';
import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import {useLanguage} from '../i18n/LanguageProvider';
import {colors} from '../theme/colors';
import {gap, radius} from '../theme/layout';
import {padX, padY, spacing} from '../theme/spacing';
import {important, face} from '../theme/type';
import {subscribeDialog, type DialogRequest} from '../utils/confirm';

export default function DialogHost() {
  const {t} = useLanguage();
  const [request, setRequest] = useState<DialogRequest | null>(null);

  useEffect(() => subscribeDialog(setRequest), []);

  const close = () => setRequest(null);

  const confirm = () => {
    const action = request?.onConfirm;
    setRequest(null);
    action?.();
  };

  return (
    <Modal
      visible={request !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close" />
        {request ? (
          <View style={styles.card}>
            <Text style={styles.title}>{t(request.title)}</Text>
            {request.lines.map((line, index) => {
              const colon = line.indexOf(':');
              const head = colon > 0 ? line.slice(0, colon) : '';
              const piece = head.match(/^Piece (\d+)$/);
              const labeled =
                head === 'Date and time' ||
                head === 'From' ||
                head === 'To' ||
                head === 'Given by' ||
                head === 'Received by' ||
                head === 'Entry' ||
                head === 'Exit';
              const shown = piece
                ? `${t('Piece {number}', {number: piece[1]})}: ${line.slice(colon + 1).trim()}`
                : labeled
                  ? `${t(head)}: ${t(line.slice(colon + 1).trim())}`
                  : t(line);
              const when = head === 'Date and time';
              return (
              <Text
                key={`${index}-${line}`}
                style={when ? styles.when : styles.line}>
                {shown}
              </Text>
              );
            })}
            <View style={styles.actions}>
              {request.hideCancel ? null : (
                <Pressable
                  accessibilityRole="button"
                  onPress={close}
                  style={[styles.button, styles.cancel]}>
                  <Text style={styles.cancelText}>{t('Cancel')}</Text>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                onPress={confirm}
                style={[
                  styles.button,
                  request.destructive ? styles.danger : styles.confirm,
                ]}>
                <Text
                  style={request.destructive ? styles.dangerText : styles.confirmText}>
                  {t(request.confirmLabel)}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: padX,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 40, 32, 0.55)',
  },
  card: {
    backgroundColor: colors.ivory,
    borderColor: colors.line,
    borderRadius: radius,
    borderTopColor: colors.gold,
    borderTopWidth: 3,
    borderWidth: 1,
    paddingHorizontal: padX,
    paddingVertical: padY,
  },
  title: {
    color: colors.green,
    fontSize: 18,
    fontFamily: face.important, fontWeight: '400',
    marginBottom: spacing.sm,
  },
  line: {
    color: colors.ink,
    fontSize: 15,
    marginTop: spacing.xs,
  },
  when: {
    color: colors.muted,
    fontSize: 13,
    fontFamily: face.important, fontWeight: '400',
    marginTop: padY,
  },
  actions: {
    flexDirection: 'row',
    gap,
    marginTop: padY,
  },
  button: {
    alignItems: 'center',
    borderRadius: radius,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: padY,
    paddingVertical: spacing.sm,
  },
  cancel: {
    backgroundColor: colors.white,
    borderColor: colors.green,
    borderWidth: 1,
  },
  cancelText: {
    color: colors.green,
    fontSize: 15,
    fontFamily: face.important, fontWeight: '400',
  },
  confirm: {
    backgroundColor: colors.gold,
  },
  confirmText: {
    color: colors.cream,
    fontSize: 15,
    fontFamily: face.important, fontWeight: '400',
  },
  danger: {
    backgroundColor: colors.danger,
  },
  dangerText: {
    color: colors.cream,
    fontSize: 15,
    fontFamily: face.important, fontWeight: '400',
  },
});
