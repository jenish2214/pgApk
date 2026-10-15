import React from 'react';
import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import type {Language} from '../i18n/active';
import {colors} from '../theme/colors';
import {capped, radius, sheetMax} from '../theme/layout';
import {padX, spacing} from '../theme/spacing';
import {text, face} from '../theme/type';

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
    backgroundColor: 'rgba(32, 33, 36, 0.4)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: padX,
  },
  sheet: {
    backgroundColor: colors.white,
    borderRadius: radius,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    ...capped(sheetMax),
  },
  title: {
    color: colors.ink,
    fontSize: text.lead,
    fontFamily: face.important, fontWeight: '400',
  },
  note: {
    color: colors.muted,
    fontSize: text.label,
    fontFamily: face.regular, fontWeight: '400',
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  choice: {
    borderColor: colors.line,
    borderRadius: radius,
    borderWidth: 1,
    marginBottom: spacing.sm,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  choiceOn: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  choiceText: {
    color: colors.ink,
    fontSize: text.section,
    fontFamily: face.important, fontWeight: '400',
  },
  choiceTextOn: {
    color: colors.cream,
  },
});
