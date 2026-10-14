import type {DeskIconName} from '../components/TabIcon';
import {listInquiries} from '../services/inquiryService';
import {listJangads} from '../services/jangadService';
import {getDashboard} from '../services/orderService';
import {listRepairs} from '../services/repairService';

export type ManageScreenName =
  | 'ManageHome'
  | 'ReadyHome'
  | 'InquiryHome'
  | 'RepairHome'
  | 'Orders'
  | 'JangadHome';

export type DrawerTab = 'Manage';

export type ManageCountKey = 'ready' | 'inquiries' | 'repairs' | 'orders' | 'jangads';

export type DrawerTarget = {
  tab: DrawerTab;
  screen: string;
};

export type ManageOption = {
  key: string;
  title: string;
  detail: string;
  icon: DeskIconName;
  target: DrawerTarget;
  countKey?: ManageCountKey;
  match: string[];
};

export type DrawerSection = {
  title: string;
  items: ManageOption[];
};

export const DRAWER_SECTIONS: DrawerSection[] = [
  {
    title: 'Shop work',
    items: [
      {
        key: 'orders',
        title: 'Orders',
        detail: 'Pending, preparing, and ready',
        icon: 'Orders',
        target: {tab: 'Manage', screen: 'Orders'},
        countKey: 'orders',
        match: ['Orders', 'OrderDetails', 'AddEditOrder'],
      },
      {
        key: 'ready',
        title: 'Ready',
        detail: 'Waiting for the customer',
        icon: 'Ready',
        target: {tab: 'Manage', screen: 'ReadyHome'},
        countKey: 'ready',
        match: ['ReadyHome'],
      },
      {
        key: 'inquiries',
        title: 'Inquiry',
        detail: 'Still deciding',
        icon: 'Inquiry',
        target: {tab: 'Manage', screen: 'InquiryHome'},
        countKey: 'inquiries',
        match: ['InquiryHome', 'AddEditInquiry'],
      },
      {
        key: 'repairs',
        title: 'Repair',
        detail: 'Open in the workshop',
        icon: 'Repair',
        target: {tab: 'Manage', screen: 'RepairHome'},
        countKey: 'repairs',
        match: ['RepairHome', 'AddEditRepair'],
      },
      {
        key: 'jangads',
        title: 'Jangad',
        detail: 'Given to another shop',
        icon: 'Jangad',
        target: {tab: 'Manage', screen: 'JangadHome'},
        countKey: 'jangads',
        match: ['JangadHome', 'AddEditJangad'],
      },
    ],
  },
];

export const EMPTY_MANAGE_COUNTS: Record<ManageCountKey, number> = {
  ready: 0,
  inquiries: 0,
  repairs: 0,
  orders: 0,
  jangads: 0,
};

export function manageCounts(): Record<ManageCountKey, number> {
  const desk = getDashboard().counts;
  return {
    ready: desk.ready,
    inquiries: listInquiries().filter(item => item.status === 'Waiting').length,
    repairs: listRepairs().filter(item => item.status !== 'Returned').length,
    orders: desk.pending + desk.preparing + desk.ready,
    jangads: listJangads().filter(item => item.status === 'Given').length,
  };
}
