import React from 'react';
import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import type {Language} from '../i18n/active';
import {colors} from '../theme/colors';
import {radius} from '../theme/layout';
import {padX, padY, spacing} from '../theme/spacing';
import {important} from '../theme/type';

const CHOICES: {id: Language; label: string}[] = [
  {id: 'en', label: 'English'},
  {id: 'hi', label: 'Hindi'},
  {id: 'gu', label: 'Gujarati'},
];

export default function LanguageSheet({
  visible,
  language,
  onClose,
  onChoose,
  t,
}: {
  visible: boolean;
  language: Language;
  onClose: () => void;
  onChoose: (language: Language) => void;
  t: (source: string) => string;
}) {

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <Text style={styles.title}>{t('Language')}</Text>
          <Text style={styles.note}>{t('Choose the shop language')}</Text>
          {CHOICES.map(choice => {
            const selected = choice.id === language;
            return (
              <Pressable
                key={choice.id}
                accessibilityRole="button"
                accessibilityState={selected ? {selected: true} : {}}
                onPress={() => onChoose(choice.id)}
                style={[styles.choice, selected && styles.choiceOn]}>
                <Text style={[styles.choiceText, selected && styles.choiceTextOn]}>
                  {t(choice.label)}
                </Text>
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(15, 58, 46, 0.45)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: padX,
  },
  sheet: {
    backgroundColor: colors.white,
    borderRadius: radius,
    marginBottom: spacing.lg,
    padding: padX,
  },
  title: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: important,
  },
  note: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: padY,
    marginTop: spacing.xs,
  },
  choice: {
    borderColor: colors.line,
    borderRadius: radius,
    borderWidth: 1,
    marginBottom: spacing.sm,
    paddingHorizontal: padY,
    paddingVertical: padY,
  },
  choiceOn: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  choiceText: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: important,
  },
  choiceTextOn: {
    color: colors.cream,
  },
});
