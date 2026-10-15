import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {ShopStackParamList} from '../types';
import {useFocusEffect} from '@react-navigation/native';
import React, {useCallback, useState} from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import AppButton from '../components/AppButton';
import AppInput from '../components/AppInput';
import Screen from '../components/Screen';
import ShopHeader from '../components/ShopHeader';
import {useLanguage} from '../i18n/LanguageProvider';
import type {Language} from '../i18n/active';
import {refreshOrderReminder} from '../services/orderReminders';
import {remindersEnabled, setRemindersEnabled, stopOrderSiren} from '../services/orderSiren';
import {isShopEmail, readProfile, writeProfile, type ShopProfile} from '../services/profileService';
import {colors} from '../theme/colors';
import {cardLift, radius} from '../theme/layout';
import {padX, spacing} from '../theme/spacing';
import {text, face} from '../theme/type';
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
  const [reminders, setReminders] = useState(true);
  const [notice, setNotice] = useState('');

  const loadAlerts = useCallback(() => {
    setProfile(readProfile());
    setReminders(remindersEnabled());
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAlerts();
    }, [loadAlerts]),
  );

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

  async function onRemindersChange(value: boolean) {
    setReminders(value);
    setRemindersEnabled(value);
    setNotice('');
    if (!value) {
      stopOrderSiren();
    }
    try {
      await refreshOrderReminder();
    } catch {
      setNotice('The reminder could not be scheduled.');
    }
    loadAlerts();
  }

  const initial = profile.name.trim().charAt(0).toUpperCase() || 'P';
  const draftInitial = draft.name.trim().charAt(0).toUpperCase() || initial;

  return (
    <Screen>
      <View style={[styles.screen, {backgroundColor: palette.ivory}]}>
        <ShopHeader title="Settings" menu />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.kicker, {color: palette.muted}]}>{t('Account')}</Text>
          <View style={[styles.group, {backgroundColor: palette.white, borderColor: palette.line}]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Edit profile')}
              onPress={openProfile}
              style={({pressed}) => [styles.row, pressed && styles.rowPressed]}>
              {profile.avatarUri ? (
                <Image source={{uri: profile.avatarUri}} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback, {backgroundColor: palette.greenSoft}]}>
                  <Text style={[styles.avatarLetter, {color: palette.green}]}>{initial}</Text>
                </View>
              )}
              <View style={styles.copy}>
                <Text style={[styles.title, {color: palette.ink}]} numberOfLines={1}>
                  {profile.name || t('Your name')}
                </Text>
                <Text style={[styles.detail, {color: palette.muted}]} numberOfLines={1}>
                  {profile.email || t('Email')}
                </Text>
              </View>
              <Text style={[styles.chevron, {color: palette.muted}]}>›</Text>
            </Pressable>
          </View>

          <Text style={[styles.kicker, {color: palette.muted}]}>{t('Preferences')}</Text>
          <View style={[styles.group, {backgroundColor: palette.white, borderColor: palette.line}]}>
            <Pressable
              accessibilityRole="button"
              onPress={openLanguage}
              style={({pressed}) => [styles.row, pressed && styles.rowPressed]}>
              <View style={styles.copy}>
                <Text style={[styles.title, {color: palette.ink}]}>{t('Language')}</Text>
              </View>
              <Text style={[styles.value, {color: palette.muted}]}>{LANGUAGE_NAMES[language]}</Text>
              <Text style={[styles.chevron, {color: palette.muted}]}>›</Text>
            </Pressable>
            <View style={[styles.hairline, {backgroundColor: palette.line}]} />
            <View style={styles.row}>
              <View style={styles.copy}>
                <Text style={[styles.title, {color: palette.ink}]}>{t('Notifications')}</Text>
                <Text style={[styles.detail, {color: palette.muted}]}>
                  {t('Order reminders on this phone.')}
                </Text>
              </View>
              <Switch
                value={reminders}
                onValueChange={onRemindersChange}
                trackColor={{false: palette.line, true: palette.green}}
                thumbColor={palette.white}
              />
            </View>
            {notice ? (
              <Text style={[styles.notice, {color: palette.ink}]}>{t(notice)}</Text>
            ) : null}
          </View>
        </ScrollView>
      </View>

      <Modal visible={editing} transparent animationType="slide" onRequestClose={() => setEditing(false)}>
        <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
        <Pressable style={styles.backdrop} onPress={() => setEditing(false)}>
          <Pressable style={[styles.sheet, {backgroundColor: palette.white}]} onPress={() => undefined}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetBody}>
            <View style={styles.handle} />
            <Text style={[styles.sheetTitle, {color: palette.ink}]}>{t('Edit profile')}</Text>
            <View style={styles.avatarPress}>
              {draft.avatarUri ? (
                <Image source={{uri: draft.avatarUri}} style={styles.avatarLarge} />
              ) : (
                <View style={[styles.avatarLarge, styles.avatarFallback, {backgroundColor: palette.greenSoft}]}>
                  <Text style={[styles.avatarLetter, {color: palette.green}]}>{draftInitial}</Text>
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  kicker: {
    fontSize: text.small,
    fontFamily: face.important, fontWeight: '400',
    letterSpacing: 0.4,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  group: {
    borderWidth: 1,
    borderRadius: radius,
    overflow: 'hidden',
    ...cardLift,
  },
  avatarPress: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarLarge: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarFallback: {
    backgroundColor: colors.ivory,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: colors.green,
    fontSize: text.lead,
    fontFamily: face.important, fontWeight: '400',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowPressed: {
    backgroundColor: colors.ivory,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontSize: text.section,
    fontFamily: face.important, fontWeight: '400',
  },
  detail: {
    fontSize: text.meta,
    fontFamily: face.regular, fontWeight: '400',
  },
  value: {
    fontSize: text.body,
    fontFamily: face.regular, fontWeight: '400',
  },
  chevron: {
    fontSize: text.title,
    fontFamily: face.regular, fontWeight: '400',
    marginTop: -2,
  },
  note: {
    color: colors.danger,
    fontSize: text.meta,
    fontFamily: face.regular, fontWeight: '400',
  },
  notice: {
    color: colors.ink,
    fontSize: text.meta,
    fontFamily: face.regular, fontWeight: '400',
    lineHeight: text.lead,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
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
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: colors.line,
    borderRadius: radius,
    height: 4,
    marginBottom: spacing.sm,
    width: 36,
  },
  sheetTitle: {
    fontSize: text.lead,
    fontFamily: face.important, fontWeight: '400',
  },
});
