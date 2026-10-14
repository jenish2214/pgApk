import {getMeta, setMeta} from '../database/database';

export type ShopProfile = {
  name: string;
  email: string;
  avatarUri: string;
};

export function readProfile(): ShopProfile {
  return {
    name: getMeta('profile_name'),
    email: getMeta('profile_email'),
    avatarUri: getMeta('profile_avatar'),
  };
}

export function writeProfile(profile: ShopProfile): void {
  setMeta('profile_name', profile.name.trim());
  setMeta('profile_email', profile.email.trim());
  setMeta('profile_avatar', profile.avatarUri.trim());
}

export function isShopEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
