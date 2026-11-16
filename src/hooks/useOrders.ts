import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Order } from '@/lib/orders';

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error: err } = await supabase
        .from('orders')
        .select('*')
        .order('id', { ascending: false });
      if (cancelled) return;
      if (err) {
        setError('تعذر تحميل الطلبات. تحقق من الاتصال.');
        setLoading(false);
        return;
      }
      setOrders((data as Order[]) ?? []);
      setLoading(false);
    }

    load();

    const channel = supabase
      .channel('orders-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => load()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { orders, loading, error };
}
