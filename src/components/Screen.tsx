import {HeaderHeightContext} from '@react-navigation/elements';
import React, {type ReactNode, useContext} from 'react';
import {KeyboardAvoidingView, StyleSheet} from 'react-native';
import {colors} from '../theme/colors';

/** Lifts every screen above the keyboard, including screens under a stack header. */
export default function Screen({children}: {children: ReactNode}) {
  const headerHeight = useContext(HeaderHeightContext) ?? 0;

  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior="padding"
      keyboardVerticalOffset={headerHeight}>
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: {
    backgroundColor: colors.ivory,
    flex: 1,
  },
});
