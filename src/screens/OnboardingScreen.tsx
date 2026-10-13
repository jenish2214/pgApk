import React, {useRef, useState} from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import type {ScrollViewInstance} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import LanguageButton from '../components/LanguageButton';
import Screen from '../components/Screen';
import {useLanguage} from '../i18n/LanguageProvider';
import {colors} from '../theme/colors';
import {radius} from '../theme/layout';
import {fonts} from '../theme/type';

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
  const scrollX = useRef(new Animated.Value(0)).current;
  const pagerRef = useRef<ScrollViewInstance>(null);
  const [pagerHeight, setPagerHeight] = useState(0);
  const [page, setPage] = useState(0);
  const isWide = width >= 700;
  const frameWidth = Math.min(width - 48, isWide ? 440 : width - 48);
  const frameHeight = Math.max(
    210,
    Math.min(pagerHeight ? pagerHeight * 0.56 : height * 0.36, frameWidth * 1.05),
  );
  const titleSize = Math.min(40, Math.max(28, width * 0.082));

  const goToPage = (index: number) => {
    const next = Math.max(0, Math.min(index, PAGES.length - 1));
    setPage(next);
    pagerRef.current?.scrollTo({x: next * width, animated: true});
  };

  const onSwipe = (offsetX: number) => {
    const next = Math.round(offsetX / width);
    if (next >= 0 && next < PAGES.length) {
      setPage(next);
    }
  };

  const lastPage = page === PAGES.length - 1;

  return (
    <Screen>
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.brandWrap, {paddingTop: insets.top + 12}]}>
        <View style={[styles.language, {top: insets.top + 8}]}>
          <LanguageButton />
        </View>
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

      <View
        style={styles.pagerSlot}
        onLayout={event => setPagerHeight(event.nativeEvent.layout.height)}>
        {pagerHeight > 0 ? (
          <Animated.ScrollView
            ref={pagerRef}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={Animated.event(
              [{nativeEvent: {contentOffset: {x: scrollX}}}],
              {useNativeDriver: false},
            )}
            onMomentumScrollEnd={event => onSwipe(event.nativeEvent.contentOffset.x)}>
            {PAGES.map((item, index) => {
              const inputRange = [
                (index - 1) * width,
                index * width,
                (index + 1) * width,
              ];
              const shift = scrollX.interpolate({
                inputRange,
                outputRange: [36, 0, -36],
                extrapolate: 'clamp',
              });
              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.35, 1, 0.35],
                extrapolate: 'clamp',
              });
              return (
                <ScrollView
                  key={item.key}
                  style={{width, height: pagerHeight}}
                  contentContainerStyle={styles.page}
                  showsVerticalScrollIndicator={false}
                  bounces={false}>
                  <View style={[styles.frame, {width: frameWidth, height: frameHeight}]}>
                    <Animated.Image
                      source={item.image}
                      resizeMode="cover"
                      style={[styles.photo, {transform: [{translateX: shift}, {scale: 1.08}]}]}
                    />
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{t(item.badge)}</Text>
                    </View>
                  </View>
                  <Animated.View style={[styles.copy, {opacity}]}>
                    <Text style={styles.kicker}>{t(item.kicker)}</Text>
                    <Text
                      style={[
                        styles.title,
                        {fontSize: titleSize, lineHeight: Math.round(titleSize * 1.12)},
                      ]}>
                      {t(item.title)}
                    </Text>
                    <Text style={styles.body}>{t(item.body)}</Text>
                  </Animated.View>
                </ScrollView>
              );
            })}
          </Animated.ScrollView>
        ) : null}
      </View>

      <View style={[styles.footer, {paddingBottom: Math.max(insets.bottom, 16)}]}>
        <View style={styles.dots}>
          {PAGES.map((item, index) => {
            const inputRange = [
              (index - 1) * width,
              index * width,
              (index + 1) * width,
            ];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 22, 8],
              extrapolate: 'clamp',
            });
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityLabel={`Onboarding page ${index + 1}`}
                onPress={() => goToPage(index)}
                hitSlop={8}>
                <Animated.View style={[styles.dot, {width: dotWidth}]} />
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.step}>
          {t('Step {step} of {total}', {step: page + 1, total: PAGES.length})}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => (lastPage ? onEnter() : goToPage(page + 1))}
          style={({pressed}) => [styles.enter, pressed && styles.pressed]}>
          <Text style={styles.enterText}>
            {lastPage ? t('Enter Pragati Gold') : t('Next')}
          </Text>
        </Pressable>
      </View>
    </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.green,
    flex: 1,
  },
  brandWrap: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  language: {
    position: 'absolute',
    right: 16,
    top: 8,
  },
  brand: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  mark: {
    alignItems: 'center',
    borderColor: colors.gold,
    borderRadius: 22,
    borderWidth: 1.5,
    height: 44,
    justifyContent: 'center',
    marginRight: 12,
    width: 44,
  },
  markText: {
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 22,
  },
  brandName: {
    color: colors.cream,
    fontFamily: fonts.serif,
    fontSize: 26,
  },
  brandLine: {
    color: colors.goldSoft,
    fontSize: 11,
    letterSpacing: 1.6,
    marginTop: 2,
  },
  pagerSlot: {
    flex: 1,
  },
  page: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  frame: {
    borderColor: 'rgba(198, 161, 91, 0.45)',
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
    bottom: 16,
    height: 72,
    justifyContent: 'center',
    position: 'absolute',
    right: 12,
    width: 72,
  },
  badgeText: {
    color: colors.greenDeep,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  copy: {
    alignItems: 'center',
    marginTop: 22,
    maxWidth: 460,
    width: '100%',
  },
  kicker: {
    color: colors.cream,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  title: {
    color: colors.cream,
    fontFamily: fonts.serif,
    marginTop: 10,
    textAlign: 'center',
  },
  body: {
    color: '#E4D8C4',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  dots: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  dot: {
    backgroundColor: colors.gold,
    borderRadius: 999,
    height: 8,
    marginHorizontal: 4,
  },
  step: {
    color: colors.goldSoft,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 12,
    textAlign: 'center',
  },
  enter: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.gold,
    borderRadius: radius,
    maxWidth: 520,
    paddingVertical: 16,
    width: '100%',
  },
  pressed: {
    opacity: 0.86,
  },
  enterText: {
    color: colors.greenDeep,
    fontSize: 17,
    fontWeight: '800',
  },
});
