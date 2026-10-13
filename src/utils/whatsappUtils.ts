import {Linking} from 'react-native';
import {phoneDigits} from './validation';

export function whatsAppPhone(phone: string): string {
  let digits = phoneDigits(phone);
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length >= 11 && digits.length <= 15) {
    return digits;
  }
  return '';
}

export function buildReadyMessage(customerName: string, orderNumber: string): string {
  return `Hello ${customerName}, your jewellery order #${orderNumber} is ready for collection at Pragati Gold. Please visit our shop to collect your order. Thank you!`;
}

export function buildShopMessage(customerName: string): string {
  return `Hello ${customerName}, this is Pragati Gold.`;
}

export function whatsappUrl(phone: string, message: string): string {
  const normalized = whatsAppPhone(phone);
  if (!normalized) {
    return '';
  }
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export async function openWhatsApp(phone: string, message: string): Promise<void> {
  const normalized = whatsAppPhone(phone);
  if (!normalized) {
    throw new Error('Enter a valid phone number before opening WhatsApp.');
  }
  const text = encodeURIComponent(message);
  const appUrl = `whatsapp://send?phone=${normalized}&text=${text}`;
  const webUrl = `https://wa.me/${normalized}?text=${text}`;
  try {
    const supported = await Linking.canOpenURL(appUrl);
    await Linking.openURL(supported ? appUrl : webUrl);
  } catch {
    try {
      await Linking.openURL(webUrl);
    } catch {
      throw new Error('WhatsApp could not be opened on this device.');
    }
  }
}

export async function callCustomer(phone: string): Promise<void> {
  const normalized = whatsAppPhone(phone);
  if (!normalized) {
    throw new Error('Enter a valid phone number before calling.');
  }
  const url = `tel:+${normalized}`;
  const supported = await Linking.canOpenURL(url);
  if (!supported) {
    throw new Error('Phone calls are not available on this device.');
  }
  await Linking.openURL(url);
}
