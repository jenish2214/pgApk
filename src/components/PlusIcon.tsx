import React from 'react';
import {StyleSheet, View} from 'react-native';

export default function PlusIcon({color, size = 18}: {color: string; size?: number}) {
  const thickness = 2;
  return (
    <View style={[styles.box, {height: size, width: size}]}>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: color,
            height: thickness,
            width: size,
          },
        ]}
      />
      <View
        style={[
          styles.bar,
          styles.upright,
          {
            backgroundColor: color,
            height: size,
            width: thickness,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    position: 'absolute',
  },
  upright: {
    left: '50%',
    marginLeft: -1,
  },
});
