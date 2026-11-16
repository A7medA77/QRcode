import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BellRing,
  Check,
  Coffee,
  Loader2,
  MapPin,
  Send,
  Star,
} from 'lucide-react';
import { completeOrder, fetchOrder, formatTime, type Order } from '@/lib/orders';
import { useTick } from '@/hooks/useTick';

type Screen = 'loading' | 'preparing' | 'ready' | 'rating' | 'done' | 'notfound';

export default function CustomerView({ orderId }: { orderId: number }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [screen, setScreen] = useState<Screen>('loading');
  const [notifyState, setNotifyState] = useState<'idle' | 'granted' | 'denied'>('idle');
  const [stars, setStars] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const readyAtRef = useRef<number | null>(null);

  useTick(screen === 'preparing');

  // Load + poll the order
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const data = await fetchOrder(orderId);
      if (cancelled) return;
      if (!data) {
        setScreen('notfound');
        return;
      }
      setOrder(data);
      setScreen((prev): Screen => {
        if (prev === 'done') return prev;
        if (data.status === 'preparing') return 'preparing';
        if (data.status === 'ready') {
          if (readyAtRef.current === null) {
            readyAtRef.current = Date.now();
            triggerCustomerAlert(data.id);
          }
          return prev === 'rating' ? prev : 'ready';
        }
        return 'rating';
      });
    }

    load();
    const timer = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [orderId]);

  const elapsed = useMemo(() => {
    if (!order) return 0;
    return Math.floor((Date.now() - new Date(order.created_at).getTime()) / 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, screen]);

  async function submitRating() {
    if (!order || stars === 0) return;
    setSubmitting(true);
    await completeOrder(order.id, stars, stars <= 3 ? feedback : null, stars >= 4);
    setSubmitting(false);
    setScreen('done');
  }

  if (screen === 'loading') {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (screen === 'notfound') {
    return (
      <div className="max-w-md mx-auto p-4 mt-8">
        <div className="bg-white rounded-3xl shadow-xl p-10 text-center border border-gray-100">
          <Coffee className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h1 className="font-bold text-lg text-gray-800 mb-1">لم يتم العثور على الطلب</h1>
          <p className="text-sm text-gray-500">
            تأكد من مسح رمز QR الصحيح أو رقم الطلب #{orderId}.
          </p>
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <main className="max-w-md mx-auto p-4 mt-4">
      <div
        className={`rounded-3xl shadow-xl overflow-hidden transition-colors duration-500 ${
          screen === 'ready' || screen === 'rating'
            ? 'bg-emerald-600 text-white'
            : 'bg-white text-gray-800 border border-gray-100'
        }`}
      >
        {/* Header */}
        <div
          className={`p-6 text-center border-b ${
            screen === 'preparing' ? 'border-gray-100' : 'border-white/20'
          }`}
        >
          <div
            className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-md mb-3 ${
              screen === 'preparing' ? 'bg-slate-900 text-white' : 'bg-white/15 text-white'
            }`}
          >
            <Coffee className="w-8 h-8" />
          </div>
          <h1 className="font-bold text-lg">مقهى المختص</h1>
          <p className={`text-xs ${screen === 'preparing' ? 'text-gray-500' : 'text-white/75'}`}>
            نظام متابعة الطلبات الفوري
          </p>
        </div>

        <div className="p-8 text-center">
          <p
            className={`text-sm font-medium mb-1 ${
              screen === 'preparing' ? 'text-gray-500' : 'text-white/80'
            }`}
          >
            رقم طلبك هو
          </p>
          <div
            className={`text-6xl font-extrabold tracking-tight my-2 ${
              screen === 'preparing' ? 'text-slate-900' : 'text-white'
            }`}
          >
            #{order.id}
          </div>

          {/* Preparing */}
          {screen === 'preparing' && (
            <div className="mt-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-800 font-bold text-sm mb-4">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                طلبك قيد التحضير الآن...
              </div>
              <p className="text-xs text-gray-400 mb-1 font-mono">
                الوقت المنقضي: {formatTime(elapsed)}
              </p>
              <p className="text-sm text-gray-500 mb-6">
                لا داعي للانتظار عند الكاشير، سنرسل لك تنبيهاً فور جاهزية طلبك.
              </p>

              <button
                onClick={() => requestNotifications(setNotifyState)}
                disabled={notifyState === 'granted'}
                className="w-full py-3.5 px-4 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md hover:bg-slate-800 disabled:bg-emerald-600 disabled:hover:bg-emerald-600 transition flex items-center justify-center gap-2"
              >
                <BellRing className="w-4 h-4" />
                {notifyState === 'granted'
                  ? 'التنبيهات والصوت مفعلة'
                  : notifyState === 'denied'
                    ? 'التنبيهات مرفوضة — أبقِ الصفحة مفتوحة'
                    : 'تفعيل التنبيه عند الجاهزية'}
              </button>
            </div>
          )}

          {/* Ready */}
          {screen === 'ready' && (
            <div className="mt-6">
              <div className="w-20 h-20 bg-white text-emerald-600 rounded-full mx-auto flex items-center justify-center shadow-lg ready-pulse mb-4">
                <Check className="w-10 h-10" strokeWidth={3} />
              </div>
              <h2 className="text-2xl font-extrabold mb-2">طلبك جاهز للاستلام!</h2>
              <p className="text-sm text-white/90 mb-6">
                تفضل بالتوجه إلى منطقة الاستلام، وبالعافية مقدماً.
              </p>
              <button
                onClick={() => setScreen('rating')}
                className="w-full py-3 bg-white text-emerald-700 font-bold rounded-xl shadow-md text-sm hover:bg-emerald-50 transition"
              >
                تم الاستلام — تقييم التجربة
              </button>
            </div>
          )}

          {/* Rating */}
          {screen === 'rating' && (
            <div className="mt-4 bg-white text-gray-800 p-6 rounded-2xl">
              <h3 className="font-bold text-lg mb-1">كيف كانت تجربتك معنا؟</h3>
              <p className="text-xs text-gray-500 mb-4">
                رأيك يهمنا ويساعدنا على تقديم الأفضل دائماً
              </p>

              <div className="flex justify-center gap-1.5 mb-5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setStars(n)}
                    className="transition-transform hover:scale-125"
                    aria-label={`تقييم ${n} نجوم`}
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        n <= stars ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {stars === 0 ? (
                <p className="text-xs text-gray-400">اختر عدد النجوم للمتابعة</p>
              ) : stars >= 4 ? (
                <div className="animate-fade-in">
                  <p className="text-sm font-bold text-emerald-700 mb-3">
                    سعداء جداً بأن الخدمة نالت إعجابك!
                  </p>
                  <a
                    href="https://search.google.com/local/writereview?placeid=YOUR_PLACE_ID"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={submitRating}
                    className="block w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md text-sm transition"
                  >
                    قيمنا على خرائط قوقل
                  </a>
                </div>
              ) : (
                <div className="animate-fade-in text-right">
                  <p className="text-xs font-bold text-rose-600 mb-2">
                    نعتذر عن أي تقصير! أخبرنا بما حدث لنعالجه فوراً:
                  </p>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={2}
                    placeholder="اكتب ملاحظتك للإدارة..."
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                  <button
                    onClick={submitRating}
                    disabled={submitting}
                    className="w-full py-2 bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 disabled:bg-slate-400"
                  >
                    {submitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    إرسال للإدارة
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Done */}
          {screen === 'done' && (
            <div className="mt-6 text-white">
              <div className="w-16 h-16 bg-white/15 rounded-full mx-auto flex items-center justify-center mb-4">
                <MapPin className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-extrabold mb-2">شكراً لك!</h2>
              <p className="text-sm text-white/90">
                تم استلام تقييمك، نتشرف بخدمتك مرة أخرى قريباً.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function requestNotifications(setState: (s: 'idle' | 'granted' | 'denied') => void) {
  if (!('Notification' in window)) {
    setState('denied');
    return;
  }
  Notification.requestPermission().then((permission) => {
    setState(permission === 'granted' ? 'granted' : 'denied');
  });
}

function triggerCustomerAlert(orderId: number) {
  if ('vibrate' in navigator) {
    navigator.vibrate([400, 200, 400, 200, 600]);
  }
  try {
    const AudioCtx: typeof AudioContext | undefined =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    playTone(523.25, 0.0, 0.2);
    playTone(659.25, 0.25, 0.4);
  } catch {
    // audio not allowed yet
  }
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`طلبك #${orderId} جاهز!`, {
      body: 'تفضل باستلام طلبك من الكاشير. بالعافية مقدماً!',
    });
  }
}
