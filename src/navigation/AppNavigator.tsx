import {errorMessage} from '../types';
import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import type {ShopStackParamList, TabParamList} from '../types';
import {finishOnboarding, hasFinishedOnboarding} from '../database/database';
import AddEditCustomerScreen from '../screens/AddEditCustomerScreen';
import AddEditOrderScreen from '../screens/AddEditOrderScreen';
import AddEditInquiryScreen from '../screens/AddEditInquiryScreen';
import CustomerDetailsScreen from '../screens/CustomerDetailsScreen';
import CustomersScreen from '../screens/CustomersScreen';
import CalendarScreen from '../screens/CalendarScreen';
import DashboardScreen from '../screens/DashboardScreen';
import AddEditJangadScreen from '../screens/AddEditJangadScreen';
import InquiriesScreen from '../screens/InquiriesScreen';
import JangadsScreen from '../screens/JangadsScreen';
import ManageScreen from '../screens/ManageScreen';
import AddEditRepairScreen from '../screens/AddEditRepairScreen';
import RepairsScreen from '../screens/RepairsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import OrderDetailsScreen from '../screens/OrderDetailsScreen';
import OrdersScreen from '../screens/OrdersScreen';
import ReadyOrdersScreen from '../screens/ReadyOrdersScreen';
import {ManageMenu} from '../components/ManageDrawer';
import {useLanguage} from '../i18n/LanguageProvider';
import {colors} from '../theme/colors';
import {text, face} from '../theme/type';
import ShopTabBar from './ShopTabBar';
import {showNotice} from '../utils/confirm';

const styles = StyleSheet.create({
  leading: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});

const ShopStack = createNativeStackNavigator<ShopStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function renderShopTabBar(props: BottomTabBarProps) {
  return <ShopTabBar {...props} />;
}

function HeaderLeading() {
  return (
    <View style={styles.leading}>
      <ManageMenu color={colors.ink} />
    </View>
  );
}

const stackScreenOptions = {
  headerStyle: {
    backgroundColor: colors.white,
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
  },
  headerTintColor: colors.ink,
  headerTitleStyle: {fontFamily: face.display, fontWeight: '400' as const, fontSize: text.title, color: colors.ink},
  headerShadowVisible: false,
  headerBackVisible: false,
  headerLeft: HeaderLeading,
  contentStyle: {backgroundColor: colors.ivory},
};

function sharedOrderScreens(t: (source: string) => string) {
  return (
    <>
      <ShopStack.Screen
        name="OrderDetails"
        component={OrderDetailsScreen}
        options={{title: t('Order')}}
      />
      <ShopStack.Screen
        name="AddEditOrder"
        component={AddEditOrderScreen}
        options={({route}) => ({
          title: route.params?.orderId ? t('Edit order') : t('New order'),
        })}
      />
      <ShopStack.Screen
        name="CustomerDetails"
        component={CustomerDetailsScreen}
        options={{title: t('Customer')}}
      />
      <ShopStack.Screen
        name="AddEditCustomer"
        component={AddEditCustomerScreen}
        options={({route}) => ({
          title: route.params?.customerId ? t('Edit customer') : t('New customer'),
        })}
      />
      <ShopStack.Screen
        name="AddEditInquiry"
        component={AddEditInquiryScreen}
        options={({route}) => ({
          title: route.params?.inquiryId ? t('Edit inquiry') : t('New inquiry'),
        })}
      />
      <ShopStack.Screen
        name="AddEditRepair"
        component={AddEditRepairScreen}
        options={({route}) => ({
          title: route.params?.repairId ? t('Edit repair') : t('New repair'),
        })}
      />
    </>
  );
}

function DeskStack() {
  const {t} = useLanguage();
  return (
    <ShopStack.Navigator screenOptions={stackScreenOptions}>
      <ShopStack.Screen
        name="DeskHome"
        component={DashboardScreen}
        options={{headerShown: false}}
      />
      <ShopStack.Screen
        name="Orders"
        component={OrdersScreen}
        options={{title: t('Orders')}}
      />
      {sharedOrderScreens(t)}
    </ShopStack.Navigator>
  );
}

function CalendarStack() {
  const {t} = useLanguage();
  return (
    <ShopStack.Navigator screenOptions={stackScreenOptions}>
      <ShopStack.Screen
        name="CalendarHome"
        component={CalendarScreen}
        options={{headerShown: false}}
      />
      {sharedOrderScreens(t)}
    </ShopStack.Navigator>
  );
}

function CustomersStack() {
  const {t} = useLanguage();
  return (
    <ShopStack.Navigator screenOptions={stackScreenOptions}>
      <ShopStack.Screen
        name="CustomersHome"
        component={CustomersScreen}
        options={{headerShown: false}}
      />
      {sharedOrderScreens(t)}
    </ShopStack.Navigator>
  );
}

function ManageStack() {
  const {t} = useLanguage();
  return (
    <ShopStack.Navigator screenOptions={stackScreenOptions}>
      <ShopStack.Screen
        name="ManageHome"
        component={ManageScreen}
        options={{headerShown: false}}
      />
      <ShopStack.Screen
        name="ReadyHome"
        component={ReadyOrdersScreen}
        options={{headerShown: false}}
      />
      <ShopStack.Screen
        name="InquiryHome"
        component={InquiriesScreen}
        options={{headerShown: false}}
      />
      <ShopStack.Screen
        name="RepairHome"
        component={RepairsScreen}
        options={{headerShown: false}}
      />
      <ShopStack.Screen
        name="JangadHome"
        component={JangadsScreen}
        options={{headerShown: false}}
      />
      <ShopStack.Screen
        name="AddEditJangad"
        component={AddEditJangadScreen}
        options={({route}) => ({
          title: route.params?.jangadId ? t('Edit jangad') : t('New jangad'),
        })}
      />
      <ShopStack.Screen
        name="Orders"
        component={OrdersScreen}
        options={{title: t('Orders')}}
      />
      {sharedOrderScreens(t)}
    </ShopStack.Navigator>
  );
}

function MainTabs() {
  const {t} = useLanguage();
  return (
    <Tab.Navigator
      tabBar={renderShopTabBar}
      screenOptions={{headerShown: false, freezeOnBlur: true, lazy: true}}>
      <Tab.Screen name="Dashboard" component={DeskStack} options={{title: t('Home')}} />
      <Tab.Screen name="Calendar" component={CalendarStack} options={{title: t('Calendar')}} />
      <Tab.Screen
        name="Customers"
        component={CustomersStack}
        options={{title: t('Customers')}}
      />
      <Tab.Screen name="Manage" component={ManageStack} options={{title: t('Settings')}} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [entered, setEntered] = useState(() => hasFinishedOnboarding());

  const enterShop = () => {
    try {
      finishOnboarding();
      setEntered(true);
    } catch (error: unknown) {
      showNotice({
        title: 'Pragati Gold',
        message: errorMessage(error, 'The shop desk could not be opened.'),
      });
    }
  };

  if (!entered) {
    return <OnboardingScreen onEnter={enterShop} />;
  }

  return (
    <NavigationContainer>
      <MainTabs />
    </NavigationContainer>
  );
}
