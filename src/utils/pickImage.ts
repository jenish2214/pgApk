import {PermissionsAndroid, Platform} from 'react-native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';

const CAMERA_MESSAGE = 'Allow camera access to photograph jewellery for this inquiry.';

async function ensureCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
  if (granted) {
    return true;
  }
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
    title: 'Camera',
    message: CAMERA_MESSAGE,
    buttonPositive: 'Allow',
    buttonNegative: 'Not now',
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

function photoUri(uri: string | undefined): string | null {
  return uri || null;
}

/** Opens the photo library. The system picker asks only if it needs access. */
export async function pickShopImage(): Promise<string | null> {
  const result = await launchImageLibrary({
    mediaType: 'photo',
    selectionLimit: 1,
    quality: 0.8,
  });
  if (result.didCancel) {
    return null;
  }
  if (result.errorCode) {
    throw new Error('The photo could not be added.');
  }
  return photoUri(result.assets?.[0]?.uri);
}

/** Asks for the camera, then photographs one piece for an inquiry. */
export async function captureShopPhoto(denial = CAMERA_MESSAGE): Promise<string | null> {
  const allowed = await ensureCameraPermission();
  if (!allowed) {
    throw new Error(denial);
  }
  const result = await launchCamera({
    mediaType: 'photo',
    cameraType: 'back',
    quality: 0.8,
    saveToPhotos: false,
  });
  if (result.didCancel) {
    return null;
  }
  if (result.errorCode === 'permission') {
    throw new Error(denial);
  }
  if (result.errorCode) {
    throw new Error('The camera could not take a photo.');
  }
  return photoUri(result.assets?.[0]?.uri);
}
