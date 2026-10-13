import React from 'react';
import {StyleSheet, View} from 'react-native';

export default function BackIcon({color}: {color: string}) {
  return <View style={[styles.chevron, {borderColor: color}]} />;
}

const styles = StyleSheet.create({
  chevron: {
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
    height: 12,
    marginLeft: 4,
    transform: [{rotate: '45deg'}],
    width: 12,
  },
});
