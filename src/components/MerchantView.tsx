import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Clock, Coffee, Loader2, Plus, Star, Timer, TrendingUp } from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import { useTick } from '@/hooks/useTick';
import {
  createOrder,
  elapsedSeconds,
  formatTime,
  markOrderReady,
  orderUrl,
  type Order,
} from '@/lib/orders';

export default function MerchantView({ onOpenCustomer }: { onOpenCustomer: (id: number) => void }) {
  const { orders, loading, error } = useOrders();
  const [latestOrder, setLatestOrder] = useState<Order | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const creatingRef = useRef(false);

  useTick(orders.some((o) => o.status === 'preparing'));

  async function handleCreateOrder() {
    if (creatingRef.current) return;
    creatingRef.current = true;
    setCreating(true);
    setCreateError(null);
    const order = await createOrder();
    creatingRef.current = false;
    setCreating(false);
    if (order) {
      setLatestOrder(order);
    } else {
      setCreateError('تعذر إنشاء الطلب، حاول مرة أخرى.');
    }
  }

  const activeOrders = orders.filter((o) => o.status === 'preparing');
  const completedOrders = orders
    .filter((o) => o.status === 'completed' || o.status === 'ready')
    .sort((a, b) => b.id - a.id);

  const ratedCount = completedOrders.filter((o) => o.google_review_clicked).length;
  const avgSec =
    completedOrders.length > 0
      ? Math.floor(
          completedOrders.reduce((acc, o) => acc + o.prep_seconds, 0) / completedOrders.length
        )
      : 0;

  return (
    <main className="max-w-6xl mx-auto p-4 sm:p-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-sm font-medium">الطلبات قيد التحضير الآن</p>
            <Coffee className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-3xl font-extrabold text-slate-800 mt-1">{activeOrders.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-sm font-medium">متوسط زمن التحضير</p>
            <Timer className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-extrabold text-amber-600 mt-1">{formatTime(avgSec)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-sm font-medium">التحويل لتقييم قوقل مابز</p>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-600 mt-1">{ratedCount} عميل</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-bold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Cashier: create order + QR */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center text-center">
          <h2 className="text-xl font-bold mb-2">الكاشير — طلب جديد</h2>
          <p className="text-sm text-gray-500 mb-6">
            اضغط لإصدار رقم طلب وعرض رمز QR للعميل
          </p>

          <button
            onClick={handleCreateOrder}
            disabled={creating}
            className="w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold rounded-xl text-lg shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
          >
            {creating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            إصدار طلب جديد
          </button>

          {createError && (
            <p className="mt-3 text-xs font-bold text-rose-600">{createError}</p>
          )}

          {latestOrder && (
            <div className="mt-6 p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 w-full flex flex-col items-center animate-fade-in">
              <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full mb-2">
                امسح الكود لمتابعة طلبك
              </span>
              <h3 className="text-4xl font-extrabold text-slate-900 mb-4">
                #{latestOrder.id}
              </h3>
              <div className="bg-white p-3 rounded-xl shadow-sm">
                <QRCodeSVG value={orderUrl(latestOrder.id)} size={150} />
              </div>
              <button
                onClick={() => onOpenCustomer(latestOrder.id)}
                className="mt-4 text-xs text-blue-600 underline hover:text-blue-800"
              >
                فتح رابط هذا الطلب في شاشة العميل
              </button>
            </div>
          )}
        </div>

        {/* Kitchen display */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold mb-4">شاشة التحضير (المطبخ / الباريستا)</h2>

          {loading ? (
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm py-8">
              <Loader2 className="w-4 h-4 animate-spin" />
              جارٍ التحميل...
            </div>
          ) : activeOrders.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">
              لا توجد طلبات قيد التحضير حالياً...
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeOrders.map((order) => (
                <ActiveOrderCard
                  key={order.id}
                  order={order}
                  onReady={() => markOrderReady(order.id)}
                />
              ))}
            </div>
          )}

          <h3 className="text-lg font-bold mt-8 mb-3 pt-6 border-t">
            سجل زمن التحضير والتقييمات
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="p-3 rounded-r-lg">رقم الطلب</th>
                  <th className="p-3">مدة التحضير</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3 rounded-l-lg">تقييم قوقل</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {completedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-gray-400">
                      لا يوجد سجل بعد
                    </td>
                  </tr>
                ) : (
                  completedOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="p-3 font-bold">#{order.id}</td>
                      <td className="p-3 font-mono text-emerald-700 font-bold">
                        {formatTime(order.prep_seconds)}
                      </td>
                      <td className="p-3">
                        {order.status === 'ready' ? (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-bold">
                            بانتظار الاستلام
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-xs font-bold">
                            مكتمل
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {order.google_review_clicked ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            تم التقييم
                          </span>
                        ) : (
                          <span className="text-gray-400">بانتظار العميل</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

function ActiveOrderCard({ order, onReady }: { order: Order; onReady: () => void }) {
  return (
    <div className="p-4 rounded-xl border-2 border-amber-200 bg-amber-50/50 flex flex-col justify-between">
      <div className="flex justify-between items-center mb-3">
        <span className="text-2xl font-extrabold text-slate-900">#{order.id}</span>
        <span className="inline-flex items-center gap-1 font-mono text-sm font-bold px-2.5 py-1 rounded bg-amber-200 text-amber-900">
          <Clock className="w-3.5 h-3.5" />
          {formatTime(elapsedSeconds(order))}
        </span>
      </div>
      <button
        onClick={onReady}
        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm shadow transition active:scale-95 inline-flex items-center justify-center gap-1.5"
      >
        <CheckCircle2 className="w-4 h-4" />
        جاهز للاستلام
      </button>
    </div>
  );
}
