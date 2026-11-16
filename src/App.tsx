import { useEffect, useState } from 'react';
import { Coffee, Store, Smartphone } from 'lucide-react';
import MerchantView from '@/components/MerchantView';
import CustomerView from '@/components/CustomerView';

type View = 'merchant' | 'customer';

export default function App() {
  const [view, setView] = useState<View>('merchant');
  const [customerOrderId, setCustomerOrderId] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderParam = params.get('order');
    if (orderParam && !Number.isNaN(parseInt(orderParam, 10))) {
      setCustomerOrderId(parseInt(orderParam, 10));
      setView('customer');
    }
  }, []);

  function openCustomer(orderId: number) {
    setCustomerOrderId(orderId);
    setView('customer');
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      <nav className="bg-slate-900 text-white p-4 shadow-md flex flex-wrap gap-3 justify-between items-center sticky top-0 z-10">
        <div className="font-bold text-lg flex items-center gap-2">
          <Coffee className="w-6 h-6 text-amber-400" />
          <span>نظام الاستلام الذكي</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('merchant')}
            className={`px-4 py-1.5 rounded-lg font-bold text-sm transition flex items-center gap-1.5 ${
              view === 'merchant' ? 'bg-emerald-600' : 'bg-slate-700 hover:bg-slate-600'
            }`}
          >
            <Store className="w-4 h-4" />
            شاشة المقهى
          </button>
          <button
            onClick={() => {
              if (customerOrderId === null) setCustomerOrderId(0);
              setView('customer');
            }}
            className={`px-4 py-1.5 rounded-lg font-bold text-sm transition flex items-center gap-1.5 ${
              view === 'customer' ? 'bg-emerald-600' : 'bg-slate-700 hover:bg-slate-600'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            شاشة العميل
          </button>
        </div>
      </nav>

      {view === 'merchant' ? (
        <MerchantView onOpenCustomer={openCustomer} />
      ) : customerOrderId && customerOrderId > 0 ? (
        <CustomerView orderId={customerOrderId} />
      ) : (
        <main className="max-w-md mx-auto p-4 mt-10">
          <div className="bg-white rounded-3xl shadow-xl p-10 text-center border border-gray-100">
            <Coffee className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h1 className="font-bold text-lg text-gray-800 mb-1">لا يوجد طلب نشط</h1>
            <p className="text-sm text-gray-500">
              امسح رمز QR من الكاشير أو أنشئ طلباً من شاشة المقهى لمتابعته هنا.
            </p>
            <button
              onClick={() => setView('merchant')}
              className="mt-5 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition"
            >
              الذهاب إلى شاشة المقهى
            </button>
          </div>
        </main>
      )}
    </div>
  );
}
