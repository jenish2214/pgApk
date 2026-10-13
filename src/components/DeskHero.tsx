import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors} from '../theme/colors';
import {radius} from '../theme/layout';
import {padX, padY, spacing} from '../theme/spacing';
import {important} from '../theme/type';

export default function DeskHero({
  kicker,
  value,
  label,
  notes,
}: {
  kicker: string;
  value: string;
  label: string;
  notes: string[];
}) {
  return (
    <View style={styles.hero}>
      <Text style={styles.kicker}>{kicker}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {notes.length > 0 ? (
        <View style={styles.notes}>
          {notes.map(note => (
            <View key={note} style={styles.note}>
              <Text style={styles.noteText}>{note}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.green,
    borderRadius: radius,
    marginBottom: padY,
    paddingHorizontal: padX,
    paddingVertical: padY,
  },
  kicker: {
    color: colors.goldSoft,
    fontSize: 12,
    fontWeight: important,
    letterSpacing: 0.6,
  },
  value: {
    color: colors.cream,
    fontSize: 40,
    fontWeight: important,
    marginTop: spacing.xs,
  },
  label: {
    color: colors.goldSoft,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  notes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: padY,
  },
  note: {
    backgroundColor: colors.greenSoft,
    borderRadius: radius,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  noteText: {
    color: colors.cream,
    fontSize: 12,
    fontWeight: important,
  },
});
