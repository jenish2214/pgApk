import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {face} from '../theme/type';
import type {TabRouteName} from '../types';

export type DeskIconName = TabRouteName | 'Ready' | 'Inquiry' | 'Repair' | 'Orders' | 'Jangad';

export default function TabIcon({
  name,
  color,
}: {
  name: DeskIconName;
  color: string;
}) {
  if (name === 'Calendar') {
    return (
      <View style={[styles.calendar, {borderColor: color}]}>
        <View style={[styles.calendarBand, {backgroundColor: color}]} />
        <View style={styles.calendarDots}>
          <View style={[styles.mark, {backgroundColor: color}]} />
          <View style={[styles.mark, {backgroundColor: color}]} />
          <View style={[styles.mark, {backgroundColor: color}]} />
          <View style={[styles.mark, {backgroundColor: color}]} />
        </View>
      </View>
    );
  }

  if (name === 'Customers') {
    return (
      <View style={styles.frame}>
        <View style={[styles.head, {backgroundColor: color}]} />
        <View style={[styles.shoulders, {backgroundColor: color}]} />
      </View>
    );
  }

  if (name === 'Inquiry') {
    return (
      <View style={[styles.note, {borderColor: color}]}>
        <View style={[styles.noteLine, {backgroundColor: color}]} />
        <View style={[styles.noteLine, styles.noteLineShort, {backgroundColor: color}]} />
      </View>
    );
  }

  if (name === 'Repair') {
    return (
      <View style={styles.frame}>
        <View style={[styles.ring, {borderColor: color}]} />
        <View style={[styles.tool, {backgroundColor: color}]} />
      </View>
    );
  }

  if (name === 'Manage') {
    return (
      <View style={styles.settings}>
        <View style={[styles.slider, {backgroundColor: color}]} />
        <View style={[styles.slider, styles.sliderShift, {backgroundColor: color}]} />
        <View style={[styles.slider, {backgroundColor: color}]} />
      </View>
    );
  }

  if (name === 'Orders') {
    return (
      <View style={[styles.note, {borderColor: color}]}>
        <View style={[styles.noteLine, {backgroundColor: color}]} />
        <View style={[styles.noteLine, {backgroundColor: color}]} />
        <View style={[styles.noteLine, styles.noteLineShort, {backgroundColor: color}]} />
      </View>
    );
  }

  if (name === 'Jangad') {
    return (
      <View style={styles.pass}>
        <View style={[styles.passBox, {borderColor: color}]} />
        <View style={[styles.passArrow, {backgroundColor: color}]} />
        <View style={[styles.passBox, {borderColor: color}]} />
      </View>
    );
  }

  if (name === 'Ready') {
    return (
      <View style={styles.frame}>
        <View style={[styles.checkShort, {backgroundColor: color}]} />
        <View style={[styles.checkLong, {backgroundColor: color}]} />
      </View>
    );
  }

  return (
    <View style={[styles.appMark, {borderColor: color}]}>
      <Text style={[styles.appMarkText, {color}]}>P</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  appMark: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  appMarkText: {
    fontFamily: face.display,
    fontSize: 13,
    lineHeight: 16,
  },
  frame: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'flex-end',
    width: 24,
  },
  calendar: {
    borderRadius: 4,
    borderWidth: 2,
    height: 22,
    overflow: 'hidden',
    width: 22,
  },
  calendarBand: {
    height: 6,
  },
  calendarDots: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 2,
  },
  mark: {
    borderRadius: 1,
    height: 3,
    margin: 1,
    width: 3,
  },
  head: {
    borderRadius: 5,
    height: 8,
    width: 8,
  },
  shoulders: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    height: 8,
    marginTop: 2,
    width: 16,
  },
  checkShort: {
    borderRadius: 1,
    height: 8,
    left: 4,
    position: 'absolute',
    top: 12,
    transform: [{rotate: '-45deg'}],
    width: 3,
  },
  note: {
    borderRadius: 4,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    paddingHorizontal: 3,
    width: 16,
  },
  noteLine: {
    borderRadius: 1,
    height: 2,
    marginVertical: 1,
  },
  noteLineShort: {
    width: '70%',
  },
  settings: {
    height: 16,
    justifyContent: 'space-between',
    width: 18,
  },
  slider: {
    borderRadius: 1,
    height: 2,
    width: 18,
  },
  sliderShift: {
    marginLeft: 6,
    width: 12,
  },
  grid: {
    alignContent: 'space-between',
    flexDirection: 'row',
    flexWrap: 'wrap',
    height: 18,
    justifyContent: 'space-between',
    width: 18,
  },
  cell: {
    borderRadius: 2,
    height: 7,
    width: 7,
  },
  ring: {
    borderRadius: 8,
    borderWidth: 2,
    height: 14,
    width: 14,
  },
  pass: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 22,
    width: 24,
  },
  passBox: {
    borderRadius: 2,
    borderWidth: 2,
    height: 14,
    width: 8,
  },
  passArrow: {
    height: 2,
    marginHorizontal: 2,
    width: 6,
  },
  tool: {
    borderRadius: 1,
    height: 3,
    marginTop: 2,
    transform: [{rotate: '-35deg'}],
    width: 16,
  },
  checkLong: {
    borderRadius: 1,
    height: 14,
    left: 10,
    position: 'absolute',
    top: 6,
    transform: [{rotate: '45deg'}],
    width: 3,
  },
});
