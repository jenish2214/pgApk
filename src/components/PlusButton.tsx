import React from 'react';
import {Pressable, StyleSheet, Text, type StyleProp, type ViewStyle} from 'react-native';
import {useLanguage} from '../i18n/LanguageProvider';
import {colors} from '../theme/colors';
import {radius} from '../theme/layout';
import {padX, padY, spacing} from '../theme/spacing';
import {important, text, face} from '../theme/type';
import PlusIcon from './PlusIcon';

type Props = {
  label: string;
  onPress: () => void;
  floating?: boolean;
  tone?: 'green' | 'gold';
  style?: StyleProp<ViewStyle>;
};

export default function PlusButton({
  label,
  onPress,
  floating = false,
  tone = 'green',
  style,
}: Props) {
  const {t} = useLanguage();
  const ink = colors.cream;
  const name = t(label);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={onPress}
      style={({pressed}) => [
        styles.button,
        floating ? styles.floating : styles.inline,
        tone === 'gold' ? styles.gold : styles.green,
        pressed && styles.pressed,
        style,
      ]}>
      <PlusIcon color={ink} size={floating ? 18 : 16} />
      <Text style={[styles.label, {color: ink}]} numberOfLines={1}>
        {name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radius,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  inline: {
    minHeight: 36,
    paddingHorizontal: padY,
  },
  floating: {
    bottom: padY,
    elevation: 4,
    minHeight: 48,
    paddingHorizontal: padX,
    position: 'absolute',
    right: padX,
    shadowColor: colors.ink,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.16,
    shadowRadius: 8,
  },
  green: {
    backgroundColor: colors.green,
  },
  pressed: {
    opacity: 0.86,
  },
  gold: {
    backgroundColor: colors.gold,
  },
  label: {
    fontSize: text.body,
    fontFamily: face.important, fontWeight: '400',
  },
});
