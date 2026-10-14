import React from 'react';
import {StyleSheet, View} from 'react-native';

export default function EyeIcon({color, off = false}: {color: string; off?: boolean}) {
  return (
    <View style={styles.frame}>
      <View style={[styles.eye, {borderColor: color}]}>
        <View style={[styles.pupil, {backgroundColor: off ? 'transparent' : color}]} />
      </View>
      {off ? <View style={[styles.slash, {backgroundColor: color}]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  eye: {
    alignItems: 'center',
    borderRadius: 11,
    borderWidth: 2,
    height: 14,
    justifyContent: 'center',
    width: 22,
  },
  pupil: {
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  slash: {
    height: 24,
    position: 'absolute',
    transform: [{rotate: '40deg'}],
    width: 2,
  },
});
