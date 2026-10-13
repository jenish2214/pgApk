import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../theme/colors';
import {padX, padY} from '../theme/spacing';
import {important} from '../theme/type';

export default function ShopHeader({title}: {title: string}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, {paddingTop: insets.top + padY}]}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.green,
    paddingBottom: padY,
    paddingHorizontal: padX,
  },
  title: {
    color: colors.cream,
    fontSize: 20,
    fontWeight: important,
  },
});
