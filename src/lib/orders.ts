export type OrderStatus = 'preparing' | 'ready' | 'completed';

import { supabase } from '@/lib/supabase';

export interface Order {
  id: number;
  status: OrderStatus;
  created_at: string;
  ready_at: string | null;
  prep_seconds: number;
  rating: number | null;
  feedback: string | null;
  google_review_clicked: boolean;
  completed_at: string | null;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function elapsedSeconds(order: Order): number {
  if (order.status === 'preparing') {
    return Math.floor((Date.now() - new Date(order.created_at).getTime()) / 1000);
  }
  return order.prep_seconds;
}

export function orderUrl(orderId: number): string {
  const base = window.location.origin + window.location.pathname;
  return `${base}?order=${orderId}`;
}

export async function createOrder(): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .insert({})
    .select()
    .single();
  if (error) {
    console.error('Failed to create order', error);
    return null;
  }
  return data as Order;
}

export async function markOrderReady(orderId: number): Promise<void> {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from('orders')
    .select('created_at')
    .eq('id', orderId)
    .maybeSingle();
  const prepSeconds = data
    ? Math.max(0, Math.floor((Date.now() - new Date(data.created_at).getTime()) / 1000))
    : 0;
  await supabase
    .from('orders')
    .update({ status: 'ready', ready_at: now, prep_seconds: prepSeconds })
    .eq('id', orderId);
}

export async function completeOrder(
  orderId: number,
  rating: number,
  feedback: string | null,
  googleClicked: boolean
): Promise<void> {
  await supabase
    .from('orders')
    .update({
      status: 'completed',
      rating,
      feedback,
      google_review_clicked: googleClicked,
      completed_at: new Date().toISOString(),
    })
    .eq('id', orderId);
}

export async function fetchOrder(orderId: number): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();
  if (error) {
    console.error('Failed to fetch order', error);
    return null;
  }
  return (data as Order) ?? null;
}
