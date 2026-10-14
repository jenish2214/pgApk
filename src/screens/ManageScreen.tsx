import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {ShopStackParamList} from '../types';
import React, {useEffect, useState} from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AppButton from '../components/AppButton';
import AppInput from '../components/AppInput';
import Screen from '../components/Screen';
import ShopHeader from '../components/ShopHeader';
import {useLanguage} from '../i18n/LanguageProvider';
import type {Language} from '../i18n/active';
import {orderSirenEnabled, setOrderSirenEnabled, testOrderSiren} from '../services/orderSiren';
import {isShopEmail, readProfile, writeProfile, type ShopProfile} from '../services/profileService';
import {colors} from '../theme/colors';
import {radius} from '../theme/layout';
import {padX, padY, spacing} from '../theme/spacing';
import {important} from '../theme/type';
import {useColors} from '../theme/ThemeProvider';
import {captureShopPhoto, pickShopImage} from '../utils/pickImage';

const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  hi: 'Hindi',
  gu: 'Gujarati',
};

const PROFILE_CAMERA = 'Allow camera access to add your photo.';

type Props = NativeStackScreenProps<ShopStackParamList, 'ManageHome'>;

export default function ManageScreen(_props: Props) {
  const {language, openLanguage, t} = useLanguage();
  const palette = useColors();
  const [profile, setProfile] = useState<ShopProfile>({name: '', email: '', avatarUri: ''});
  const [draft, setDraft] = useState<ShopProfile>({name: '', email: '', avatarUri: ''});
  const [editing, setEditing] = useState(false);
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [siren, setSiren] = useState(true);
  const [testing, setTesting] = useState(false);
  const [sirenNote, setSirenNote] = useState('');

  useEffect(() => {
    setProfile(readProfile());
    setSiren(orderSirenEnabled());
  }, []);

  function openProfile() {
    setDraft(profile);
    setNameError('');
    setEmailError('');
    setPhotoError('');
    setEditing(true);
  }

  function saveProfile() {
    const nextName = draft.name.trim();
    const nextEmail = draft.email.trim();
    const nameProblem = nextName.length < 2 ? 'Enter your name.' : '';
    const emailProblem = isShopEmail(nextEmail) ? '' : 'Enter a valid email.';
    setNameError(nameProblem);
    setEmailError(emailProblem);
    if (nameProblem || emailProblem) {
      return;
    }
    const saved = {name: nextName, email: nextEmail, avatarUri: draft.avatarUri.trim()};
    writeProfile(saved);
    setProfile(saved);
    setEditing(false);
  }

  async function choosePhoto(source: 'camera' | 'library') {
    try {
      const uri =
        source === 'camera' ? await captureShopPhoto(PROFILE_CAMERA) : await pickShopImage();
      if (uri) {
        setDraft(current => ({...current, avatarUri: uri}));
        setPhotoError('');
      }
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : PROFILE_CAMERA);
    }
  }

  async function testSiren() {
    setTesting(true);
    setSirenNote('');
    try {
      const played = await testOrderSiren();
      if (played === 'silent') {
        setSirenNote('Turn up the phone alarm volume to hear the siren.');
      } else if (played === 'denied') {
        setSirenNote('Allow notifications to hear the order siren.');
      }
    } catch {
      setSirenNote('Allow notifications to hear the order siren.');
    } finally {
      setTesting(false);
    }
  }

  const initial = profile.name.trim().charAt(0).toUpperCase() || 'P';
  const draftInitial = draft.name.trim().charAt(0).toUpperCase() || initial;

  return (
    <Screen>
      <View style={[styles.screen, {backgroundColor: palette.ivory}]}>
        <ShopHeader title="Settings" menu />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Edit profile')}
            onPress={openProfile}
            style={({pressed}) => [
              styles.profile,
              {backgroundColor: palette.white, borderColor: palette.line},
              pressed && styles.rowPressed,
            ]}>
            {profile.avatarUri ? (
              <Image source={{uri: profile.avatarUri}} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarLetter}>{initial}</Text>
              </View>
            )}
            <View style={styles.copy}>
              <Text style={[styles.title, {color: palette.ink}]}>
                {profile.name || t('Your name')}
              </Text>
              <Text style={[styles.detail, {color: palette.muted}]}>
                {profile.email || t('Email')}
              </Text>
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={openLanguage}
            style={({pressed}) => [
              styles.row,
              {backgroundColor: palette.white, borderColor: palette.line},
              pressed && styles.rowPressed,
            ]}>
            <View style={styles.copy}>
              <Text style={[styles.title, {color: palette.ink}]}>{t('Language')}</Text>
              <Text style={[styles.detail, {color: palette.muted}]}>{LANGUAGE_NAMES[language]}</Text>
            </View>
          </Pressable>

          <View style={[styles.card, {backgroundColor: palette.white, borderColor: palette.line}]}>
            <Text style={[styles.section, {color: palette.muted}]}>{t('Order alerts')}</Text>
            <Text style={[styles.detail, {color: palette.ink}]}>
              {t(
                'Every order reminder plays the siren: 9:00 AM, 12:00 AM, and when an order is ready, due, or late. Loudness follows your phone alarm volume.',
              )}
            </Text>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{checked: siren}}
              onPress={() => {
                const next = !siren;
                setSiren(next);
                setOrderSirenEnabled(next);
              }}
              style={[styles.switchRow, {borderColor: palette.line}]}>
              <Text style={[styles.title, {color: palette.ink}]}>{siren ? t('On') : t('Off')}</Text>
            </Pressable>
            {sirenNote ? <Text style={styles.note}>{t(sirenNote)}</Text> : null}
            <AppButton label="Test siren" onPress={testSiren} disabled={testing} variant="secondary" />
          </View>
        </ScrollView>
      </View>

      <Modal visible={editing} transparent animationType="slide" onRequestClose={() => setEditing(false)}>
        <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
        <Pressable style={styles.backdrop} onPress={() => setEditing(false)}>
          <Pressable style={[styles.sheet, {backgroundColor: palette.white}]} onPress={() => undefined}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetBody}>
            <Text style={[styles.sheetTitle, {color: palette.ink}]}>{t('Edit profile')}</Text>
            <View style={styles.avatarPress}>
              {draft.avatarUri ? (
                <Image source={{uri: draft.avatarUri}} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarLetter}>{draftInitial}</Text>
                </View>
              )}
              {photoError ? <Text style={styles.note}>{t(photoError)}</Text> : null}
            </View>
            <AppButton label="Take photo" onPress={() => choosePhoto('camera')} />
            <AppButton label="Photo library" onPress={() => choosePhoto('library')} variant="secondary" />
            <AppInput
              label="Your name"
              value={draft.name}
              onChangeText={value => setDraft(current => ({...current, name: value}))}
              error={nameError}
            />
            <AppInput
              label="Email"
              value={draft.email}
              onChangeText={value => setDraft(current => ({...current, email: value}))}
              error={emailError}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <AppButton label="Save profile" onPress={saveProfile} />
            <AppButton label="Cancel" onPress={() => setEditing(false)} variant="ghost" />
            </ScrollView>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: padX,
    paddingBottom: padY * 2,
    gap: spacing.md,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius,
    padding: spacing.md,
    gap: spacing.sm,
  },
  section: {
    fontSize: 13,
    fontWeight: important,
  },
  profile: {
    alignItems: 'center',
    borderRadius: radius,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  avatarPress: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: colors.green,
    fontSize: 28,
    fontWeight: important,
  },
  row: {
    borderWidth: 1,
    borderRadius: radius,
    padding: spacing.md,
  },
  rowPressed: {
    opacity: 0.7,
  },
  copy: {
    gap: spacing.xs,
  },
  title: {
    fontSize: 16,
    fontWeight: important,
  },
  detail: {
    fontSize: 13,
    fontWeight: important,
  },
  switchRow: {
    borderWidth: 1,
    borderRadius: radius,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  note: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: important,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    borderTopLeftRadius: radius,
    borderTopRightRadius: radius,
    maxHeight: '90%',
  },
  sheetBody: {
    gap: spacing.sm,
    padding: spacing.lg,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: important,
  },
});
