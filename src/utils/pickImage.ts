import {launchImageLibrary} from 'react-native-image-picker';

/** Opens the photo library for any still image. */
export async function pickShopImage(): Promise<string | null> {
  const result = await launchImageLibrary({
    mediaType: 'photo',
    selectionLimit: 1,
    quality: 0.8,
  });
  if (result.didCancel || result.errorCode) {
    return null;
  }
  return result.assets?.[0]?.uri || null;
}
