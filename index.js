/**
 * @format
 */

import 'react-native-gesture-handler';
import notifee, {EventType} from '@notifee/react-native';
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {continueOrderReminder, onShopAlertDelivered} from './src/services/orderReminders';

notifee.onBackgroundEvent(async ({type, detail}) => {
  if (type !== EventType.DELIVERED) {
    return;
  }
  const handled = await onShopAlertDelivered(detail.notification);
  if (handled) {
    await continueOrderReminder();
  }
});

AppRegistry.registerComponent(appName, () => App);
