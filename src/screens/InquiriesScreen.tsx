import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {Inquiry, ShopStackParamList} from '../types';
import {errorMessage} from '../types';
import React, {useCallback, useState} from 'react';
import {ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import AppInput from '../components/AppInput';
import EmptyState from '../components/EmptyState';
import PlusButton from '../components/PlusButton';
import Screen from '../components/Screen';
import ShopHeader from '../components/ShopHeader';
import {listInquiries} from '../services/inquiryService';
import {listWindow} from '../utils/listWindow';
import {useDebouncedValue} from '../utils/useDebouncedValue';
import {showNotice} from '../utils/confirm';
import {callCustomer} from '../utils/whatsappUtils';
import {categoryImage} from '../utils/categories';
import {formatDay} from '../utils/dates';
import {useLanguage} from '../i18n/LanguageProvider';
import {colors} from '../theme/colors';
import {cardLift, radius} from '../theme/layout';
import {padX, padY, spacing} from '../theme/spacing';
import {important, face} from '../theme/type';

const STATUS_LABEL = {
  Waiting: 'Waiting',
  Bought: 'Bought',
  Closed: 'Closed',
} as const;

type Props = NativeStackScreenProps<ShopStackParamList, 'InquiryHome'>;

export default function InquiriesScreen({navigation}: Props) {
  const {t} = useLanguage();
  const [query, setQuery] = useState('');
  const settledQuery = useDebouncedValue(query);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    try {
      setInquiries(listInquiries(settledQuery));
      setError('');
    } catch (loadError: unknown) {
      setError(errorMessage(loadError, 'Inquiries could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [settledQuery]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <Screen>
    <View style={styles.screen}>
      <ShopHeader
        title="Inquiry"
        menu
      />
      <FlatList
        data={inquiries}
        keyExtractor={item => String(item.id)}
        {...listWindow}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <AppInput
              label="Search"
              value={query}
              onChangeText={setQuery}
              placeholder="Name, phone, or jewellery"
              autoCapitalize="none"
            />
            {error ? <Text style={styles.error}>{t(error)}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.green} />
          ) : (
            <EmptyState
              title="No data"
              message="No data"
            />
          )
        }
        renderItem={({item}) => {
          const photo = item.pieces.find(piece => piece.imageUri)?.imageUri;
          const tags = item.pieces.map(piece => piece.tagNumber).filter(Boolean).join(', ');
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('AddEditInquiry', {inquiryId: item.id})}
              style={({pressed}) => [styles.card, pressed && styles.pressed]}>
              {photo ? (
                <Image source={{uri: photo}} style={styles.photo} />
              ) : (
                <Image source={categoryImage('Other')} style={styles.photo} />
              )}
              <View style={styles.copy}>
                <View style={styles.row}>
                  <Text style={styles.name}>{item.customerName}</Text>
                  <Text style={styles.status}>{t(STATUS_LABEL[item.status])}</Text>
                </View>
                <Text style={styles.item}>{item.itemName}</Text>
                <Text style={styles.meta}>
                  {tags ? t('Tag {tag}', {tag: tags}) : t('No tag')}
                  {item.phone ? `  ·  ${item.phone}` : ''}
                </Text>
                <Text style={styles.meta}>
                  {t('Follow-up {date}', {date: formatDay(item.followUpDate)})}
                </Text>
                {item.phone ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      callCustomer(item.phone).catch((callError: unknown) => {
                        showNotice({
                          title: 'Pragati Gold',
                          message: errorMessage(callError, 'The customer could not be called.'),
                        });
                      });
                    }}
                    style={styles.call}>
                    <Text style={styles.callText}>{t('Call')}</Text>
                  </Pressable>
                ) : null}
              </View>
            </Pressable>
          );
        }}
      />
      <PlusButton
        floating
        label="Inquiry"
        onPress={() => navigation.navigate('AddEditInquiry')}
      />
    </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.ivory,
    flex: 1,
  },
  list: {
    paddingBottom: 88,
    paddingHorizontal: padX,
    paddingTop: padY,
  },
  error: {
    color: colors.danger,
    marginBottom: padY,
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radius,
    borderWidth: 1,
    flexDirection: 'row',
    gap: padY,
    marginBottom: padY,
    padding: padY,
    ...cardLift,
  },
  pressed: {
    opacity: 0.86,
  },
  photo: {
    borderRadius: radius,
    height: 72,
    width: 72,
  },
  copy: {
    flex: 1,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  name: {
    color: colors.ink,
    flex: 1,
    fontSize: 15,
    fontFamily: face.important, fontWeight: '400',
    marginRight: spacing.sm,
  },
  status: {
    color: colors.green,
    fontSize: 12,
    fontFamily: face.important, fontWeight: '400',
  },
  item: {
    color: colors.ink,
    fontSize: 15,
    marginTop: spacing.xs,
  },
  call: {
    alignSelf: 'flex-start',
    borderColor: colors.green,
    borderRadius: radius,
    borderWidth: 1,
    marginTop: spacing.sm,
    paddingHorizontal: padY,
    paddingVertical: spacing.xs,
  },
  callText: {
    color: colors.green,
    fontSize: 13,
    fontFamily: face.important, fontWeight: '400',
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
});
