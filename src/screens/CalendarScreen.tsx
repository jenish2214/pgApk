import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {Order, ShopStackParamList} from '../types';
import {errorMessage} from '../types';
import React, {useCallback, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ManageMenu} from '../components/ManageDrawer';
import PlusButton from '../components/PlusButton';
import {useLanguage} from '../i18n/LanguageProvider';
import Screen from '../components/Screen';
import StatusBadge from '../components/StatusBadge';
import {listOrders} from '../services/orderService';
import {subscribeShopChanges} from '../services/shopEvents';
import {
  MONTH_NAMES,
  WEEKDAYS,
  dayKeyFromParts,
  dayReason,
  marksByDay,
  monthGrid,
  ordersOnDay,
} from '../utils/calendar';
import {formatDay, parseShopDate, todayISO} from '../utils/dates';
import {colors} from '../theme/colors';
import {face} from '../theme/type';
import {radius} from '../theme/layout';
import {padX, padY, spacing} from '../theme/spacing';

type Props = NativeStackScreenProps<ShopStackParamList, 'CalendarHome'>;

const WEEK_LETTERS = {
  en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  hi: ['र', 'सो', 'मं', 'बु', 'गु', 'शु', 'श'],
  gu: ['ર', 'સો', 'મં', 'બુ', 'ગુ', 'શુ', 'શ'],
} as const;

export default function CalendarScreen({navigation}: Props) {
  const {language, t} = useLanguage();
  const insets = useSafeAreaInsets();
  const today = todayISO();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return {year: now.getFullYear(), month: now.getMonth()};
  });
  const [selected, setSelected] = useState(today);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    try {
      setOrders(listOrders());
      setError('');
    } catch (loadError: unknown) {
      setError(errorMessage(loadError, 'Orders could not be loaded onto the calendar.'));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      return subscribeShopChanges(load);
    }, [load]),
  );

  const shiftMonth = (delta: number) => {
    setCursor(current => {
      const next = new Date(current.year, current.month + delta, 1);
      return {year: next.getFullYear(), month: next.getMonth()};
    });
  };

  const marks = marksByDay(orders);
  const cells = monthGrid(cursor.year, cursor.month);
  const monthKey = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`;
  const markedCount = Object.keys(marks).filter(key => key.startsWith(monthKey)).length;
  const showToday = () => {
    const now = new Date();
    setCursor({year: now.getFullYear(), month: now.getMonth()});
    setSelected(todayISO());
  };
  const dayOrders = ordersOnDay(orders, selected);
  const selectedDate = parseShopDate(selected);
  const locale = language === 'hi' ? 'hi-IN' : language === 'gu' ? 'gu-IN' : 'en-IN';
  const selectedLabel = selectedDate
    ? selectedDate.toLocaleDateString(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : selected;

  return (
    <Screen>
    <View style={styles.screen}>
      <View style={[styles.header, {paddingTop: insets.top + padY}]}>
        <ManageMenu />
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{t('Calendar')}</Text>
        </View>
        <PlusButton
          label="Order"
          tone="gold"
          onPress={() => navigation.navigate('AddEditOrder', {orderDate: selected})}
        />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {error ? <Text style={styles.error}>{t(error)}</Text> : null}
        <View style={styles.card}>
          <View style={styles.monthRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              onPress={() => shiftMonth(-1)}
              hitSlop={8}
              style={styles.monthButton}>
              <Text style={styles.monthArrow}>‹</Text>
            </Pressable>
            <View style={styles.monthCopy}>
              <Text style={styles.month}>{t(MONTH_NAMES[cursor.month])}</Text>
              <Text style={styles.year}>{cursor.year}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next month"
              onPress={() => shiftMonth(1)}
              hitSlop={8}
              style={styles.monthButton}>
              <Text style={styles.monthArrow}>›</Text>
            </Pressable>
          </View>
          <View style={styles.weekRow}>
            {WEEK_LETTERS[language].map((letter, index) => (
              <Text key={`${WEEKDAYS[index]}-${index}`} style={styles.weekday}>
                {letter}
              </Text>
            ))}
          </View>
          <View style={styles.grid}>
            {cells.map((day, index) => {
              if (!day) {
                return <View key={`blank-${index}`} style={styles.cell} />;
              }
              const key = dayKeyFromParts(cursor.year, cursor.month, day);
              const mark = marks[key];
              const isSelected = key === selected;
              const isToday = key === today;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityState={isSelected ? {selected: true} : {}}
                  accessibilityLabel={mark ? `${day}, has customer orders` : String(day)}
                  onPress={() => setSelected(key)}
                  style={styles.cell}>
                  <View
                    style={[
                      styles.day,
                      isToday && !isSelected ? styles.dayToday : null,
                      isSelected ? styles.daySelected : null,
                    ]}>
                    <Text
                      style={[
                        styles.dayText,
                        isToday && !isSelected ? styles.dayTextToday : null,
                        isSelected ? styles.dayTextSelected : null,
                      ]}>
                      {day}
                    </Text>
                  </View>
                  <View style={[styles.dot, mark ? styles.dotOn : null]} />
                </Pressable>
              );
            })}
          </View>
          <View style={styles.legend}>
            <View style={styles.legendDot} />
            <Text style={styles.legendText}>
              {markedCount === 0
                ? t('No data')
                : t(
                    markedCount === 1
                      ? '{count} date with customers'
                      : '{count} dates with customers',
                    {count: markedCount},
                  )}
            </Text>
            {selected !== today ? (
              <Pressable accessibilityRole="button" onPress={showToday} hitSlop={6}>
                <Text style={styles.todayLink}>{t('Today')}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        <View style={styles.dayHead}>
          <Text style={styles.dayTitle}>{selectedLabel}</Text>
          <Text style={styles.dayCount}>
            {dayOrders.length === 0
              ? t('No data')
              : t(dayOrders.length === 1 ? '{count} order' : '{count} orders', {
                  count: dayOrders.length,
                })}
          </Text>
        </View>
        {dayOrders.map(order => (
          <Pressable
            key={order.id}
            accessibilityRole="button"
            onPress={() => navigation.navigate('OrderDetails', {orderId: order.id})}
            style={styles.order}>
            <View style={styles.orderTop}>
              <Text style={styles.orderName} numberOfLines={1}>
                {order.customerName || t('Customer record is missing')}
              </Text>
              <StatusBadge status={order.status} />
            </View>
            <Text style={styles.orderItem} numberOfLines={1}>
              {order.itemName}
              {order.customerPhone ? `  ·  ${order.customerPhone}` : ''}
            </Text>
            <Text style={styles.orderMeta} numberOfLines={2}>
              {t(dayReason(order, selected))}
              {'  ·  '}
              {t('Ordered {date}', {date: formatDay(order.orderDate)})}
              {order.expectedDeliveryDate
                ? `  ·  ${t('Delivery {date}', {date: formatDay(order.expectedDeliveryDate)})}`
                : ''}
            </Text>
            {order.description ? (
              <Text style={styles.orderMeta} numberOfLines={1}>
                {order.description}
              </Text>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>
    </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.ivory,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.green,
    flexDirection: 'row',
    paddingBottom: padY,
    paddingHorizontal: padX,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: colors.cream,
    fontFamily: face.display,
    fontSize: 22,
  },
  content: {
    paddingBottom: spacing.xl,
    paddingHorizontal: padX,
    paddingTop: padY,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radius,
    borderTopColor: colors.gold,
    borderTopWidth: 3,
    borderWidth: 1,
    paddingBottom: spacing.sm,
    paddingHorizontal: padY,
    paddingTop: spacing.sm,
  },
  monthRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  monthButton: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  monthArrow: {
    color: colors.ink,
    fontSize: 22,
  },
  monthCopy: {
    alignItems: 'center',
  },
  month: {
    color: colors.ink,
    fontFamily: face.display,
    fontSize: 20,
  },
  year: {
    color: colors.gold,
    fontSize: 12,
    fontFamily: face.important, fontWeight: '400',
    marginTop: spacing.xs,
  },
  weekRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  weekday: {
    color: colors.muted,
    flex: 1,
    fontSize: 12,
    fontFamily: face.important, fontWeight: '400',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: '14.28%',
  },
  day: {
    alignItems: 'center',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  dayToday: {
    borderColor: colors.gold,
    borderWidth: 1.5,
  },
  daySelected: {
    backgroundColor: colors.green,
  },
  dayText: {
    color: colors.ink,
    fontSize: 13,
  },
  dayTextToday: {
    color: colors.green,
    fontFamily: face.important, fontWeight: '400',
  },
  dayTextSelected: {
    color: colors.cream,
    fontFamily: face.important, fontWeight: '400',
  },
  dot: {
    borderRadius: 2,
    height: 4,
    marginTop: 2,
    width: 4,
  },
  dotOn: {
    backgroundColor: colors.gold,
  },
  legend: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: padY,
    paddingVertical: spacing.xs,
  },
  legendDot: {
    backgroundColor: colors.gold,
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  legendText: {
    color: colors.muted,
    flex: 1,
    fontSize: 12,
  },
  todayLink: {
    color: colors.green,
    fontSize: 12,
    fontFamily: face.important, fontWeight: '400',
  },
  dayHead: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    marginTop: padY,
  },
  dayTitle: {
    color: colors.ink,
    flex: 1,
    fontFamily: face.display,
    fontSize: 16,
  },
  dayCount: {
    color: colors.muted,
    fontSize: 12,
    marginLeft: spacing.sm,
  },
  order: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radius,
    borderWidth: 1,
    marginBottom: padY,
    paddingHorizontal: padX,
    paddingVertical: padY,
  },
  orderTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  orderName: {
    color: colors.ink,
    flex: 1,
    fontSize: 14,
    fontFamily: face.important, fontWeight: '400',
  },
  orderItem: {
    color: colors.green,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  orderMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: spacing.xs,
  },
});
