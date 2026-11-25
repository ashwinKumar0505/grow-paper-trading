import {
AlertCircle,
CalendarClock,
CheckCircle2,
Clock,
TimerOff,
XCircle,
} from 'lucide-react';
import React from 'react';
import { Order,OrderStatus } from '../../../types/market';

export type OrderFilter =
  | 'ALL'
  | 'SCHEDULED'
  | 'PENDING'
  | 'EXECUTED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'EXPIRED';

export const FILTER_TABS: Array<{ id: OrderFilter; label: string }> = [
  { id: 'ALL', label: 'All' },
  { id: 'SCHEDULED', label: 'Scheduled' },
  { id: 'PENDING', label: 'Open/Pending' },
  { id: 'EXECUTED', label: 'Executed' },
  { id: 'CANCELLED', label: 'Cancelled' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'EXPIRED', label: 'Expired' },
];

export function formatISTDateTime(ts?: number): string {
  if (!ts || !Number.isFinite(ts)) return '—';
  const date = new Date(ts);
  const datePart = date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  });
  const timePart = date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
  return `${datePart}, ${timePart.toUpperCase()}`;
}

export function getStatusMeta(status: OrderStatus): {
  label: string;
  badgeClass: string;
  icon: React.ReactNode;
} {
  switch (status) {
    case 'SCHEDULED':
      return {
        label: 'Scheduled',
        badgeClass:
          'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50',
        icon: <CalendarClock className="w-3 h-3" />,
      };
    case 'PENDING':
      return {
        label: 'Open/Pending',
        badgeClass:
          'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/50',
        icon: <Clock className="w-3 h-3" />,
      };
    case 'EXECUTED':
      return {
        label: 'Executed',
        badgeClass:
          'bg-emerald-50 text-[#00D09C] dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/50',
        icon: <CheckCircle2 className="w-3 h-3" />,
      };
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        badgeClass:
          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 border border-gray-200/60 dark:border-gray-700',
        icon: <XCircle className="w-3 h-3" />,
      };
    case 'REJECTED':
      return {
        label: 'Rejected',
        badgeClass:
          'bg-rose-50 text-[#EB5B5B] dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-800/50',
        icon: <AlertCircle className="w-3 h-3" />,
      };
    case 'EXPIRED':
      return {
        label: 'Expired',
        badgeClass:
          'bg-orange-50 text-orange-600 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200/60 dark:border-orange-800/50',
        icon: <TimerOff className="w-3 h-3" />,
      };
  }
}

export function getOrderDisplayPrices(order: Order) {
  const placedPrice = order.limitPrice ?? order.triggerPrice ?? order.price;
  const actualExecutionPrice =
    order.status === 'EXECUTED'
      ? order.executionPrice ?? order.avgPrice ?? order.price
      : undefined;
  return { placedPrice, actualExecutionPrice };
}

