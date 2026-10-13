import React, {type ReactNode} from 'react';
import {KeyboardAvoidingView, Platform, StyleSheet} from 'react-native';

/** Lifts every screen above the keyboard. */
export default function Screen({children}: {children: ReactNode}) {
  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
