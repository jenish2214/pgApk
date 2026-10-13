/**
 * @format
 */

import 'react-native-gesture-handler';
import notifee, {EventType} from '@notifee/react-native';
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {continueOrderReminder} from './src/services/orderReminders';

notifee.onBackgroundEvent(async ({type}) => {
  if (type !== EventType.DELIVERED) {
    return;
  }
  await continueOrderReminder();
});

AppRegistry.registerComponent(appName, () => App);
