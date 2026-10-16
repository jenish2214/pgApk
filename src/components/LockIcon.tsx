import React from 'react';
import {StyleSheet, View} from 'react-native';

export default function LockIcon({color, open = false}: {color: string; open?: boolean}) {
  return (
    <View style={styles.frame}>
      <View
        style={[
          styles.shackle,
          {borderColor: color},
          open ? styles.shackleOpen : null,
        ]}
      />
      <View style={[styles.body, {backgroundColor: color}]}>
        <View style={styles.keyhole} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    height: 30,
    justifyContent: 'flex-end',
    width: 26,
  },
  shackle: {
    borderBottomWidth: 0,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    borderWidth: 3,
    height: 14,
    marginBottom: -1,
    width: 18,
  },
  shackleOpen: {
    transform: [{translateX: 5}, {translateY: -3}],
  },
  body: {
    alignItems: 'center',
    borderRadius: 4,
    height: 16,
    justifyContent: 'center',
    width: 26,
  },
  keyhole: {
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    height: 6,
    width: 4,
  },
});
