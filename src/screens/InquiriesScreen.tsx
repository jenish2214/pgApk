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
import {showNotice} from '../utils/confirm';
import {callCustomer} from '../utils/whatsappUtils';
import {categoryImage} from '../utils/categories';
import {formatDay} from '../utils/dates';
import {colors} from '../theme/colors';
import {radius} from '../theme/layout';
import {padX, padY, spacing} from '../theme/spacing';
import {important} from '../theme/type';

const STATUS_LABEL = {
  Waiting: 'Waiting',
  Bought: 'Bought',
  Closed: 'Closed',
} as const;

type Props = NativeStackScreenProps<ShopStackParamList, 'InquiryHome'>;

export default function InquiriesScreen({navigation}: Props) {
  const [query, setQuery] = useState('');
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    try {
      setInquiries(listInquiries(query));
      setError('');
    } catch (loadError: unknown) {
      setError(errorMessage(loadError, 'Inquiries could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [query]);

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
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />
      <FlatList
        data={inquiries}
        keyExtractor={item => String(item.id)}
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
            {error ? <Text style={styles.error}>{error}</Text> : null}
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
              style={styles.card}>
              {photo ? (
                <Image source={{uri: photo}} style={styles.photo} />
              ) : (
                <Image source={categoryImage('Other')} style={styles.photo} />
              )}
              <View style={styles.copy}>
                <View style={styles.row}>
                  <Text style={styles.name}>{item.customerName}</Text>
                  <Text style={styles.status}>{STATUS_LABEL[item.status]}</Text>
                </View>
                <Text style={styles.item}>{item.itemName}</Text>
                <Text style={styles.meta}>
                  {tags ? `Tag ${tags}` : 'No tag'}
                  {item.phone ? `  ·  ${item.phone}` : ''}
                </Text>
                <Text style={styles.meta}>Follow-up {formatDay(item.followUpDate)}</Text>
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
                    <Text style={styles.callText}>Call</Text>
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
    fontWeight: important,
    marginRight: spacing.sm,
  },
  status: {
    color: colors.green,
    fontSize: 12,
    fontWeight: important,
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
    fontWeight: important,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
});
