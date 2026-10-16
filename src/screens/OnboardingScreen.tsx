import React, {useRef, useState} from 'react';
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ScrollViewInstance,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useLanguage} from '../i18n/LanguageProvider';
import {colors} from '../theme/colors';
import {radius} from '../theme/layout';
import {spacing} from '../theme/spacing';
import {face, text} from '../theme/type';

const PAGES = [
  {
    key: 'story',
    image: require('../assets/jewel-necklace.jpg'),
    badge: 'SINCE\n1987',
    kicker: 'CRAFTED FOR YOUR FOREVER',
    title: 'Jewels that become\nyour story',
    body: 'Discover heirloom artistry, follow every order, and remember every occasion beautifully.',
  },
  {
    key: 'orders',
    image: require('../assets/jewel-earrings.jpg'),
    badge: 'HAND\nFINISHED',
    kicker: 'EVERY ORDER, KEPT WITH CARE',
    title: 'Follow each piece\nuntil it is ready',
    body: 'Save the customer, the design, and the promised date so the workshop and the counter stay in step.',
  },
  {
    key: 'ready',
    image: require('../assets/jewel-bangles.jpg'),
    badge: 'FOR\nYOU',
    kicker: 'READY FOR COLLECTION',
    title: 'Call them when\nthe jewel is waiting',
    body: 'See what is ready, then reach the customer by phone or WhatsApp from the shop desk.',
  },
];

export default function OnboardingScreen({onEnter}: {onEnter: () => void}) {
  const {t} = useLanguage();
  const {width, height} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pagerRef = useRef<ScrollViewInstance>(null);
  const [page, setPage] = useState(0);
  const frameWidth = Math.min(width - 48, 440);
  const frameHeight = Math.max(200, Math.min(height * 0.34, frameWidth * 0.95));
  const lastPage = page === PAGES.length - 1;

  const goToPage = (index: number) => {
    const next = Math.max(0, Math.min(index, PAGES.length - 1));
    setPage(next);
    pagerRef.current?.scrollTo({x: next * width, animated: true});
  };

  const onSwipe = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next >= 0 && next < PAGES.length && next !== page) {
      setPage(next);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.brandWrap, {paddingTop: insets.top + spacing.md}]}>
        <View style={styles.brand}>
          <View style={styles.mark}>
            <Text style={styles.markText}>P</Text>
          </View>
          <View>
            <Text style={styles.brandName}>Pragati Gold</Text>
            <Text style={styles.brandLine}>{t('FINE JEWELLERY HOUSE')}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onSwipe}
        scrollEventThrottle={16}
        style={styles.pager}>
        {PAGES.map(item => (
          <View key={item.key} style={[styles.page, {width}]}>
            <View style={[styles.frame, {width: frameWidth, height: frameHeight}]}>
              <Image source={item.image} resizeMode="cover" style={styles.photo} />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{t(item.badge)}</Text>
              </View>
            </View>
            <Text style={styles.kicker}>{t(item.kicker)}</Text>
            <Text style={styles.title}>{t(item.title)}</Text>
            <Text style={styles.body}>{t(item.body)}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, {paddingBottom: Math.max(insets.bottom, spacing.lg)}]}>
        <View style={styles.dots}>
          {PAGES.map((item, index) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={`Onboarding page ${index + 1}`}
              onPress={() => goToPage(index)}
              hitSlop={8}
              style={[styles.dot, index === page && styles.dotOn]}
            />
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onEnter}
          style={({pressed}) => [styles.start, pressed && styles.pressed]}>
          <Text style={styles.startText}>{t('Start')}</Text>
        </Pressable>
        {lastPage ? null : (
          <Pressable
            accessibilityRole="button"
            onPress={() => goToPage(page + 1)}
            hitSlop={8}
            style={({pressed}) => [styles.next, pressed && styles.pressed]}>
            <Text style={styles.nextText}>{t('Next')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.green,
    flex: 1,
  },
  brandWrap: {
    alignItems: 'center',
    paddingBottom: spacing.sm,
  },
  brand: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  mark: {
    alignItems: 'center',
    borderColor: colors.cream,
    borderRadius: 22,
    borderWidth: 1.5,
    height: 44,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 44,
  },
  markText: {
    color: colors.cream,
    fontFamily: face.display,
    fontSize: 22,
  },
  brandName: {
    color: colors.cream,
    fontFamily: face.display,
    fontSize: 26,
  },
  brandLine: {
    color: colors.goldSoft,
    fontSize: text.tiny,
    letterSpacing: 1.6,
    marginTop: 2,
  },
  pager: {
    flex: 1,
  },
  page: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  frame: {
    borderColor: 'rgba(255,255,255,0.28)',
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  photo: {
    height: '100%',
    width: '100%',
  },
  badge: {
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderRadius: 36,
    bottom: spacing.md,
    height: 72,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing.md,
    width: 72,
  },
  badgeText: {
    color: colors.cream,
    fontSize: text.small,
    fontFamily: face.display, fontWeight: '400',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  kicker: {
    color: colors.cream,
    fontSize: text.small,
    fontFamily: face.display, fontWeight: '400',
    letterSpacing: 1.5,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  title: {
    color: colors.cream,
    fontFamily: face.display,
    fontSize: text.display,
    lineHeight: text.display + 8,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  body: {
    color: colors.goldSoft,
    fontSize: text.body,
    lineHeight: text.body + 7,
    marginTop: spacing.md,
    maxWidth: 460,
    textAlign: 'center',
  },
  footer: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  dots: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  dot: {
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 999,
    height: 8,
    marginHorizontal: 4,
    width: 8,
  },
  dotOn: {
    backgroundColor: colors.gold,
    width: 22,
  },
  start: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.gold,
    borderRadius: radius,
    minHeight: 56,
    justifyContent: 'center',
    maxWidth: 520,
    paddingVertical: spacing.md,
    width: '100%',
  },
  next: {
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.86,
  },
  startText: {
    color: colors.cream,
    fontSize: text.lead,
    fontFamily: face.display, fontWeight: '400',
  },
  nextText: {
    color: colors.cream,
    fontSize: text.section,
    fontFamily: face.important, fontWeight: '400',
  },
});
