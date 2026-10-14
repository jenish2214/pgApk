import {colors as light} from './colors';

export type Palette = typeof light;

export const darkPalette: Palette = {
  ...light,
  green: '#0F3A2E',
  greenDeep: '#071812',
  greenSoft: '#1C4F40',
  cream: '#F7F3EA',
  ivory: '#10241E',
  white: '#17362C',
  ink: '#F7F3EA',
  muted: '#C6B89A',
  line: '#2C4A40',
  pendingBg: '#2A2418',
  pendingText: '#E7D3A1',
  preparingBg: '#163038',
  preparingText: '#B7DCE8',
  readyBg: '#163528',
  readyText: '#B7E4C7',
  deliveredBg: '#1C2822',
  deliveredText: '#D5DDD8',
  cancelledBg: '#3A221F',
  cancelledText: '#F0C2BC',
};
