import {HeaderHeightContext} from '@react-navigation/elements';
import React, {type ReactNode, useContext} from 'react';
import {KeyboardAvoidingView, StyleSheet, View} from 'react-native';
import {colors} from '../theme/colors';
import {capped, contentMax} from '../theme/layout';

/** Lifts every screen above the keyboard, including screens under a stack header. */
export default function Screen({children}: {children: ReactNode}) {
  const headerHeight = useContext(HeaderHeightContext) ?? 0;

  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior="padding"
      keyboardVerticalOffset={headerHeight}>
      <View style={styles.column}>{children}</View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: {
    backgroundColor: colors.ivory,
    flex: 1,
  },
  column: {
    flex: 1,
    ...capped(contentMax),
  },
});
