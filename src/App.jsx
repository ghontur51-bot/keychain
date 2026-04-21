import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, signInWithPopup } from 'firebase/auth';
import { db, auth, googleProvider } from './firebase';
import confetti from 'canvas-confetti';
import {
  ShoppingBag, Menu as MenuIcon, X, Plus, Minus, Clock, MapPin, Phone, Calendar,
  CalendarCheck,
  Users, Coffee, CheckCircle, ArrowRight, Sparkles, Search, Loader2, PartyPopper,
  Utensils, Music, Map as MapIcon, Heart, Check, User, LogOut, Mail, Lock, FileText, CheckCircle2
} from 'lucide-react';

const COLORS = {
  coffee: '#7E6A93', deepBrown: '#2A2431', cream: '#F7F5FA',
  mutedGreen: '#EBE6F0', softGold: '#A284C5', white: '#FFFFFF',
};

const Section = ({ id, children, className = "" }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setIsVisible(true);
    }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref} id={id}
      className={`py-16 md:py-24 px-4 md:px-12 lg:px-24 transition-all duration-1000 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'} ${className}`}
    >
      {children}
    </section>
  );
};

const Button = ({ children, variant = 'primary', className = "", onClick, type = "button", disabled = false }) => {
  const base = "px-6 py-3 md:px-8 md:py-3 rounded-full font-medium transition-all duration-500 transform active:scale-95 flex items-center justify-center gap-2 group overflow-hidden relative disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base";
  const styles = {
    primary: `bg-[#A284C5] text-[#2A2431] hover:shadow-[0_10px_30px_-10px_rgba(162,132,197,0.5)]`,
    secondary: `bg-white border-2 border-[#7E6A93] text-[#7E6A93] hover:bg-[#7E6A93] hover:text-white`,
    ghost: `text-[#2A2431] hover:bg-black/5`,
    magic: `bg-gradient-to-r from-[#7E6A93] to-[#2A2431] text-white hover:shadow-[0_10px_30px_-10px_rgba(126,106,147,0.5)]`
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className}`}>
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      <div className="absolute inset-0 bg-white/20 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
    </button>
  );
};

const Loader = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(onFinish, 4000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-[1000] bg-[#2A2431] flex flex-col items-center justify-center overflow-hidden animate-pure-fade-in-out pointer-events-none">
      <div className="text-center">
        <h1 className="text-4xl md:text-6xl font-serif font-bold text-white tracking-[0.2em] mb-4 drop-shadow-lg">
          <span className="text-[#A284C5]">C O Z Y</span> T H R E A D S
        </h1>
        <p className="text-[10px] md:text-xs text-[#7E6A93] uppercase tracking-[0.3em] font-medium opacity-90">
          Where every thread tells a story
        </p>
      </div>
    </div>
  );
};

const playSuccessChime = () => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const playNote = (freq, startTime, duration) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
    gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + startTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + startTime);
    osc.stop(ctx.currentTime + startTime + duration);
  };
  playNote(329.63, 0, 1.5);
  playNote(415.30, 0.1, 1.5);
  playNote(493.88, 0.2, 1.5);
  playNote(659.25, 0.35, 3.0);
};

export default function App() {
  const [isAppBooting, setIsAppBooting] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [, setFeedback] = useState(null);
  const [bookingType, setBookingType] = useState('table');
  const [aiSuggestions] = useState([]);

  // Auth & Dashboard States
  const [user, setUser] = useState(undefined);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');
  const [zoomedImage, setZoomedImage] = useState(null);

  const [userBookings, setUserBookings] = useState([]);
  const [userOrders, setUserOrders] = useState([]);
  const [bookingView, setBookingView] = useState('dashboard'); // 'dashboard' or 'form'
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: '', message: '' });

  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedQty, setSelectedQty] = useState(1);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);

  const dynamicCategories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return ['All', ...cats];
  }, [products]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const data = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setProducts(data);
    });

    return () => { unsubscribe(); unsubProducts(); };
  }, []);

  // Auto-login modal logic removed per user request

  // Sync Bookings & Orders when User Logs in
  useEffect(() => {
    if (user) {
      const qBookings = query(collection(db, 'bookings'), where('userId', '==', user.uid));
      const qOrders = query(collection(db, 'orders'), where('userId', '==', user.uid));

      const unsubBookings = onSnapshot(qBookings, (snapshot) => {
        const data = [];
        snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
        data.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
        setUserBookings(data);
        if (data.length > 0) setBookingView('dashboard');
      });

      const unsubOrders = onSnapshot(qOrders, (snapshot) => {
        const data = [];
        snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
        data.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
        setUserOrders(data);
        if (data.length > 0) setBookingView('dashboard'); // Ensure dashboard view
      });

      return () => { unsubBookings(); unsubOrders(); };
    } else {
      setUserBookings([]);
      setUserOrders([]);
      setBookingView('form');
    }
  }, [user]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const triggerSuccessExperience = (title, message) => {
    setSuccessModal({ isOpen: true, title, message });
    setTimeout(() => { playSuccessChime(); }, 100);
    setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 120,
        origin: { y: 0.5 },
        colors: ['#7E6A93', '#A284C5', '#EBE6F0', '#F7F5FA', '#FFFFFF'],
        zIndex: 2000,
        disableForReducedMotion: true
      });
    }, 800);
  };

  const addToCart = (item, qty = 1) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, qty: Math.min(i.qty + qty, item.stock) } : i);
      return [...prev, { ...item, qty: Math.min(qty, item.stock) }];
    });
    setFeedback(`Added ${qty} ${item.name}!`);
    setTimeout(() => setFeedback(null), 2000);
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.min(item.stock, Math.max(0, item.qty + delta));
        return newQty === 0 ? null : { ...item, qty: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const cartTotal = useMemo(() => cart.reduce((acc, item) => acc + (item.price * item.qty), 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((acc, item) => acc + item.qty, 0), [cart]);
  const filteredItems = useMemo(() => {
    return activeTab === 'All' ? products : products.filter(i => i.category === activeTab);
  }, [activeTab, products]);

  // Authentication Submission
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);
    const form = new FormData(e.target);
    const email = form.get('email');
    const password = form.get('password');

    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        setFeedback('Welcome back to Cozy Threads.');
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        setFeedback('Account beautifully created.');
      }
      setIsAuthModalOpen(false);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setAuthError(err.message.replace('Firebase:', ''));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setAuthError('');
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      setFeedback('Welcome to Cozy Threads with Google.');
      setIsAuthModalOpen(false);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setAuthError(err.message.replace('Firebase:', ''));
    } finally {
      setIsLoading(false);
    }
  };

  const requireAuth = () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return false;
    }
    return true;
  };

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const submitOrder = async (e) => {
    e.preventDefault();
    if (cart.length === 0 || isLoading) return;
    if (!requireAuth()) return;

    setIsLoading(true);
    try {
      const form = new FormData(e.target);
      const customerData = {
        name: form.get('name'),
        phone: form.get('phone'),
        address: form.get('address')
      };

      const data = {
        userId: user.uid,
        userEmail: user.email,
        customer: customerData,
        items: cart,
        total: cartTotal,
        status: 'pending',
        payment_id: 'test_skip_razorpay',
        createdAt: serverTimestamp()
      };

      // ==========================================
      // BUTTER SMOOTH UX: Immediate Success Trigger
      // ==========================================
      setCart([]);
      setIsCheckoutModalOpen(false);
      triggerSuccessExperience("Test Order Confirmed!", "Razorpay is currently OFF. Order synced directly.");
      setBookingView('dashboard');

      // Async Background Firestore Push (eliminates network lag)
      addDoc(collection(db, 'orders'), data).catch(err => {
        console.error("Firebase Sync Error", err);
        alert("Background sync failed. Check connection.");
      });

    } catch (err) {
      console.error(err);
      alert("Checkout Logic Error: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!requireAuth()) return;

    setIsLoading(true);
    try {
      const form = new FormData(e.target);
      const data = Object.fromEntries(form.entries());
      data.userId = user.uid;
      data.userEmail = user.email;
      data.type = bookingType;
      data.createdAt = serverTimestamp();

      await addDoc(collection(db, 'bookings'), data);
      e.target.reset();
      triggerSuccessExperience(bookingType === 'table' ? 'Table Secured' : 'Venue Request Sent', 'We look forward to hosting you in our sanctuary.');
      setBookingView('dashboard');
    } catch (err) {
      console.error(err);
      alert("Firebase Error (Booking): " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Status Styling Logic for Realtime Sync
  const getStatusStyle = (status) => {
    switch (status) {
      case 'pending': return 'bg-purple-100 text-purple-700';
      case 'preparing': return 'bg-fuchsia-100 text-fuchsia-700';
      case 'out_for_delivery': return 'bg-blue-100 text-blue-700';
      case 'delivered': return 'bg-[#EBE6F0]/40 text-green-800'; // Cafe Green match
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status) => status?.replace(/_/g, ' ') || 'pending';

  return (
    <div className="min-h-screen font-sans selection:bg-[#EBE6F0] selection:text-[#2A2431] relative w-full overflow-x-hidden" style={{ backgroundColor: COLORS.cream }}>
      {isAppBooting && <Loader onFinish={() => setIsAppBooting(false)} />}

      {/* NAVBAR */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-700 ${isScrolled ? 'bg-white/90 backdrop-blur-xl shadow-lg py-3' : 'bg-transparent py-4'}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-9 h-9 md:w-10 md:h-10 bg-[#7E6A93] rounded-xl flex items-center justify-center text-white rotate-3 group-hover:rotate-0 transition-all">
              <Coffee size={20} />
            </div>
            <span className="text-xl md:text-2xl font-serif font-bold text-[#2A2431]">Cozy Threads</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {[
              { label: 'Home', action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
              { label: 'Collection', action: () => document.getElementById('menu').scrollIntoView({ behavior: 'smooth' }) },
              { label: 'Dashboard', action: () => document.getElementById('hub').scrollIntoView({ behavior: 'smooth' }) }
            ].map(link => (
              <button key={link.label} onClick={link.action} className="text-[#2A2431] font-medium hover:text-[#7E6A93] transition-all text-sm uppercase tracking-widest">{link.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => setIsCartOpen(true)} className="relative p-2 text-[#2A2431] hover:bg-black/5 rounded-full transition-all">
              <ShoppingBag size={22} />
              {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-[#A284C5] text-[#2A2431] text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{cartCount}</span>}
            </button>
            <button
              onClick={() => user ? signOut(auth) : setIsAuthModalOpen(true)}
              className="px-4 py-2 bg-[#A284C5] text-white rounded-full shadow-md hover:shadow-[0_10px_30px_-10px_rgba(162,132,197,0.5)] transition-all font-bold text-sm flex items-center gap-2"
            >
              {user ? <><LogOut size={16} /> Logout</> : <><User size={16} /> Login</>}
            </button>
            <button className="md:hidden p-2 text-[#2A2431]" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <MenuIcon size={24} />
            </button>
            <Button variant="primary" className="hidden md:flex" onClick={() => document.getElementById('menu').scrollIntoView({ behavior: 'smooth' })}>Order Now</Button>
          </div>
        </div>
      </nav>

      <section id="home" className="relative min-h-[100vh] md:h-screen flex items-center pt-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#2A2431]/80 via-[#2A2431]/30 to-[#2A2431]/80 md:bg-gradient-to-r md:from-[#2A2431]/80 md:via-[#2A2431]/40 md:to-transparent z-10" />
          <picture>
            <source media="(min-width: 768px)" srcSet="/hero_pc.jpg" />
            <img src="/hero_phone.jpg" alt="Cozy Threads Handcrafted" className="w-full h-full object-cover animate-subtle-zoom" />
          </picture>
        </div>
        <div className="relative z-10 px-6 md:px-12 lg:px-24 max-w-4xl text-white pt-10 md:pt-0">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-1.5 rounded-full text-[10px] md:text-sm font-medium mb-6 animate-in slide-in-from-bottom-4 shadow-lg shadow-black/20">
            <Sparkles size={14} className="text-[#A284C5]" /> Crafted with love, carried everywhere
          </div>
          <h1 className="text-5xl md:text-8xl font-serif font-bold mb-4 md:mb-6 leading-tight max-w-[15ch] drop-shadow-xl">
            Tiny <span className="text-[#A284C5] italic">Pieces</span><br />of Joy.
          </h1>
          <p className="text-sm md:text-xl text-white/90 mb-8 md:mb-12 max-w-md md:max-w-xl font-medium drop-shadow-md">
            Aesthetic handcrafted items , designed to sprinkle little threads of magic in your everyday life.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="primary" className="w-full sm:w-auto text-base py-5 px-8 shadow-[#A284C5]/30 shadow-2xl" onClick={() => document.getElementById('menu').scrollIntoView({ behavior: 'smooth' })}>Explore Collection</Button>
            <Button variant="secondary" className="w-full sm:w-auto text-base py-5 px-8 hidden md:flex backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white hover:text-[#2A2431]" onClick={() => document.getElementById('hub').scrollIntoView({ behavior: 'smooth' })}>My Orders</Button>
          </div>
        </div>
      </section>

      {/* MENU */}
      <Section id="menu">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-3xl md:text-6xl font-serif font-bold text-[#2A2431] mb-4">Our Craft Menu</h2>
          <div className="w-16 md:w-24 h-1 bg-[#7E6A93] mx-auto rounded-full" />
        </div>
        <div className="flex overflow-x-auto gap-2 pb-6 no-scrollbar -mx-4 px-4 md:justify-center md:flex-wrap md:mx-0">
          {dynamicCategories.map(cat => (
            <button key={cat} onClick={() => setActiveTab(cat)} className={`whitespace-nowrap px-6 py-2.5 rounded-full transition-all text-xs md:text-sm font-bold border-2 ${activeTab === cat ? 'bg-[#2A2431] text-white border-[#2A2431] shadow-lg' : 'bg-white text-[#2A2431] border-transparent'}`}>{cat}</button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
          {filteredItems.map(item => (
            <div key={item.id} onClick={() => { setSelectedProduct(item); setSelectedQty(1); setSelectedImageIdx(0); }} className="group bg-white rounded-3xl p-4 shadow-sm flex flex-col relative animate-in slide-in-from-bottom-4 cursor-pointer hover:shadow-xl transition-all">
              <div className="w-full aspect-square bg-gray-50 rounded-2xl mb-4 overflow-hidden relative">
                <img src={(Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : (item.img || "https://images.unsplash.com/photo-1584820927498-cafe2c17ab7b?auto=format&fit=crop&w=400"))} onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1584820927498-cafe2c17ab7b?auto=format&fit=crop&w=400"; }} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 bg-[#EBE6F0]" />
                <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-bold text-[#7E6A93]">{item.tag}</div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-serif font-bold text-[#2A2431] mb-1">{item.name}</h3>
                <p className="text-[11px] text-gray-400 mb-4 line-clamp-2">{item.desc}</p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                <span className="text-xl font-serif font-bold text-[#7E6A93]">₹{item.price.toFixed(2)}</span>
                <button onClick={(e) => { e.stopPropagation(); addToCart(item, 1); }} className="bg-[#A284C5] text-white p-2.5 rounded-xl flex items-center justify-center transform transition-all active:scale-95 group-hover:rotate-6"><ShoppingBag size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* HUB / DASHBOARD */}
      <Section id="hub" className="bg-[#F7F5FA]">
        <div className="max-w-6xl mx-auto space-y-10 lg:space-y-0 lg:grid lg:grid-cols-5 lg:gap-16 lg:items-center">
          <div className="lg:col-span-2 space-y-6 text-center lg:text-left">
            <h2 className="text-4xl md:text-6xl font-serif font-bold text-[#2A2431]">My Cozy Threads <br className="hidden lg:block" /> Hub</h2>
            <p className="text-[#7E6A93] text-sm md:text-lg max-w-sm mx-auto lg:mx-0">
              Track the live journey of your beautifully crafted keychains, right to your doorstep!
            </p>
          </div>

          <div className="lg:col-span-3">
            {userOrders.length > 0 ? (

              /* USER HUB DASHBOARD (Orders) */
              <div className="space-y-6 animate-in fade-in slide-in-from-right-10 duration-500">

                {/* Orders Tracker Section */}
                <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl border border-white relative overflow-hidden flex flex-col">
                  <h3 className="text-xl font-serif font-bold text-[#2A2431] mb-4 flex items-center gap-2"><ShoppingBag size={20} /> Live Product Tracker</h3>
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left text-sm text-gray-700">
                      <tbody className="divide-y divide-gray-50">
                        {userOrders.map(order => (
                          <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-3">
                              <span className="font-bold text-[#2A2431] block">Order #{order.id.slice(-5).toUpperCase()}</span>
                              <span className="text-xs text-gray-400">{new Date(order.createdAt?.toDate()).toLocaleDateString() || 'Just now'}</span>
                            </td>
                            <td className="p-3 font-medium flex items-center gap-1">
                              <span className="text-xs text-gray-500">{order.items?.length} items</span>
                            </td>
                            <td className="p-3 font-serif font-bold text-[#7E6A93]">₹{order.total?.toFixed(2)}</td>
                            <td className="p-3 text-right">
                              <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusStyle(order.status)}`}>
                                {getStatusLabel(order.status)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            ) : (

              /* CUTE EMPTY STATE FOR KEYCHAINS */
              <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-2xl border border-[#A284C5]/20 relative overflow-hidden min-h-[500px] flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-left-10 duration-500">
                <img src="/mascots.png" alt="Cute Mascots" className="w-72 h-72 object-contain mb-6 animate-rich-float" />
                <h3 className="text-4xl font-serif font-bold text-[#A284C5] mb-2 tracking-wide">Hiiii thereee !!</h3>
                <p className="text-xl text-[#7E6A93] font-bold mt-2 leading-relaxed max-w-sm mx-auto">
                  buyy some productss noww !! <br /> too see the live updates of themm !!
                </p>
                <div className="mt-10">
                  <Button variant="primary" className="shadow-[#A284C5]/50 shadow-xl px-10 py-4 text-xl" onClick={() => document.getElementById('menu').scrollIntoView({ behavior: 'smooth' })}>
                    Shop Cuties💖
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Section>

      <footer className="bg-[#2A2431] text-white py-16 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex justify-center items-center">
          <p className="text-[10px] text-white/20 uppercase font-bold tracking-[0.2em]">&copy; {new Date().getFullYear()} Cozy Threads. All Rights Reserved.</p>
        </div>
      </footer>

      {/* MAC-STYLE PRODUCT MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center px-4 overflow-hidden">
          <div className="absolute inset-0 bg-[#2A2431]/40 backdrop-blur-md transition-opacity duration-300" onClick={() => setSelectedProduct(null)} />
          <div className="relative bg-[#F7F5FA] rounded-[2rem] w-full max-w-3xl max-h-[85vh] shadow-[0_30px_60px_-15px_rgba(42,36,49,0.3)] flex flex-col md:flex-row overflow-hidden transform transition-all animate-in zoom-in-95 duration-300 border-2 border-white/50 backdrop-blur-xl">

            {/* Mac OS Window Header */}
            <div className="absolute top-4 left-4 flex gap-1.5 z-20">
              <div className="w-3.5 h-3.5 rounded-full bg-red-400 cursor-pointer shadow-sm hover:bg-red-500" onClick={() => setSelectedProduct(null)} />
              <div className="w-3.5 h-3.5 rounded-full bg-yellow-400 shadow-sm" />
              <div className="w-3.5 h-3.5 rounded-full bg-green-400 shadow-sm" />
            </div>

            {/* Image Preview */}
            <div className="w-full md:w-1/2 shrink-0 bg-gradient-to-br from-white to-[#F7F5FA]/50 relative p-8 flex flex-col justify-center items-center overflow-hidden">
              <div className="w-full h-56 md:h-72 flex items-center justify-center p-2 mb-4">
                <img
                  onClick={() => setZoomedImage(Array.isArray(selectedProduct.images) && selectedProduct.images.length > 0 ? (selectedProduct.images[selectedImageIdx] || selectedProduct.images[0]) : (selectedProduct.img || 'https://images.unsplash.com/photo-1584820927498-cafe2c17ab7b?auto=format&fit=crop&w=400'))}
                  src={Array.isArray(selectedProduct.images) && selectedProduct.images.length > 0 ? (selectedProduct.images[selectedImageIdx] || selectedProduct.images[0]) : (selectedProduct.img || 'https://images.unsplash.com/photo-1584820927498-cafe2c17ab7b?auto=format&fit=crop&w=400')}
                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1584820927498-cafe2c17ab7b?auto=format&fit=crop&w=400'; }}
                  alt={selectedProduct.name}
                  className="max-w-full max-h-full object-contain rounded-2xl animate-in zoom-in duration-300 shadow-xl bg-white p-2 border border-[#A284C5]/10 cursor-zoom-in hover:scale-105 transition-transform"
                />
              </div>

              {Array.isArray(selectedProduct.images) && selectedProduct.images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto p-2 w-full max-w-[95%] snap-x no-scrollbar justify-start md:justify-center">
                  {selectedProduct.images.map((imgUrl, idx) => (
                    <button key={idx} onClick={() => setSelectedImageIdx(idx)} className={`w-14 h-14 shrink-0 rounded-xl overflow-hidden snap-center border-2 transition-all shadow-sm ${selectedImageIdx === idx ? 'border-[#A284C5] shadow-md scale-110' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'}`}>
                      <img src={imgUrl} className="w-full h-full object-cover" onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1584820927498-cafe2c17ab7b?auto=format&fit=crop&w=100'; }} />
                    </button>
                  ))}
                </div>
              )}

              <div className="absolute bottom-6 left-0 w-full flex justify-center pointer-events-none">
                <span className="bg-[#2A2431] text-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-lg">
                  Handcrafted {selectedProduct.category}
                </span>
              </div>
            </div>

            {/* Details */}
            <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col justify-between overflow-y-auto">
              <div>
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#2A2431] mb-2">{selectedProduct.name}</h2>
                <div className="text-2xl font-serif font-bold text-[#A284C5] mb-6">₹{Number(selectedProduct.price).toFixed(2)}</div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#A284C5]/10 mb-8 relative overflow-hidden">
                  <div className="w-1.5 h-full bg-[#A284C5] absolute left-0 top-0"></div>
                  <p className="text-sm text-[#7E6A93] font-medium leading-relaxed whitespace-pre-wrap">{selectedProduct.desc}</p>
                </div>

                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2">Quantity</p>
                <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm w-max border border-gray-100 mb-6">
                  <button onClick={() => setSelectedQty(Math.max(1, selectedQty - 1))} className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-[#2A2431] hover:bg-gray-100 transition-colors"><Minus size={16} /></button>
                  <span className="text-lg font-bold w-8 text-center">{selectedQty}</span>
                  <button onClick={() => setSelectedQty(prev => Math.min(prev + 1, selectedProduct.stock))} className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-[#2A2431] hover:bg-gray-100 transition-colors"><Plus size={16} /></button>
                </div>
              </div>

              <Button variant="primary" className="w-full py-5 text-lg font-bold shadow-[#A284C5]/30 shadow-xl" onClick={() => {
                addToCart(selectedProduct, selectedQty);
                setSelectedProduct(null);
              }}>
                Add to Bag
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* REFINED CART PANEL (NO DELIVERY FORM IN SIDEBAR) */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full md:max-w-md bg-white h-full flex flex-col animate-in slide-in-from-right">
            <div className="p-6 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag size={20} className="text-[#7E6A93]" />
                <h3 className="text-xl font-serif font-bold">Your Order</h3>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-black/5 rounded-full"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-200"><ShoppingBag size={40} /></div>
                  <p className="text-gray-400 italic font-serif">Your coffee bag is feeling light...</p>
                  <Button variant="secondary" onClick={() => setIsCartOpen(false)}>Start Shopping</Button>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex gap-4 items-center bg-[#F7F5FA]/30 p-3 rounded-2xl animate-in fade-in">
                    <img src={(Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : (item.img || 'https://images.unsplash.com/photo-1584820927498-cafe2c17ab7b?auto=format&fit=crop&q=80&w=400'))} className="w-20 h-20 bg-gray-100 rounded-xl object-cover" />
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-[#2A2431]">{item.name}</h4>
                      <p className="text-xs text-[#7E6A93] font-bold mb-2">₹{item.price.toFixed(2)}</p>
                      <div className="flex items-center gap-3">
                        <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-md bg-white flex items-center justify-center text-[#2A2431]"><Minus size={12} /></button>
                        <span className="text-sm font-bold w-4 text-center">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded-md bg-white flex items-center justify-center text-[#2A2431]"><Plus size={12} /></button>
                      </div>
                    </div>
                    <div className="text-right font-serif font-bold text-[#2A2431]">
                      ₹{(item.price * item.qty).toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </div>
            {cart.length > 0 && (
              <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <div className="flex justify-between items-center text-2xl font-serif font-bold mb-6">
                  <span>Total Amount</span>
                  <span className="text-[#7E6A93]">₹{cartTotal.toFixed(2)}</span>
                </div>
                <Button
                  onClick={() => {
                    if (!requireAuth()) return;
                    setIsCartOpen(false);
                    setIsCheckoutModalOpen(true);
                  }}
                  variant="primary"
                  className="w-full py-5 text-lg font-bold"
                >
                  Proceed to Checkout <ArrowRight size={20} />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* NEW STANDALONE CHECKOUT MODAL */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center px-4 overflow-hidden">
          <div className="absolute inset-0 bg-[#2A2431]/40 backdrop-blur-sm transition-opacity duration-500" onClick={() => setIsCheckoutModalOpen(false)} />

          <div className="relative bg-white border border-[#A284C5]/20 rounded-[2.5rem] p-10 md:p-14 max-w-md w-full shadow-2xl animate-in slide-in-from-bottom-12 fade-in duration-500">
            <button onClick={() => setIsCheckoutModalOpen(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-all">
              <X size={20} />
            </button>

            <div className="w-14 h-14 bg-[#F7F5FA] rounded-full flex items-center justify-center mb-6 shadow-sm border border-[#A284C5]/50">
              <MapPin size={24} className="text-[#2A2431]" />
            </div>



            <h2 className="text-3xl font-serif font-bold text-[#2A2431] mb-1">Delivery Details</h2>
            <p className="text-sm text-[#7E6A93] mb-8">Where should we bring your magic?</p>

            <form onSubmit={submitOrder} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-2">Name</label>
                <input name="name" required placeholder="John Doe" defaultValue={user?.displayName || ''} className="w-full bg-gray-50 border-2 border-transparent focus:border-[#A284C5] focus:bg-white rounded-xl p-4 text-sm outline-none transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-2">Phone</label>
                <input name="phone" required placeholder="+1 234 567 890" className="w-full bg-gray-50 border-2 border-transparent focus:border-[#A284C5] focus:bg-white rounded-xl p-4 text-sm outline-none transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-2">Address</label>
                <textarea name="address" required rows="3" placeholder="Apt 123, Coffee Street..." className="w-full bg-gray-50 border-2 border-transparent focus:border-[#A284C5] focus:bg-white rounded-xl p-4 text-sm outline-none transition-all resize-none" />
              </div>

              <Button type="submit" disabled={isLoading} variant="primary" className={`w-full py-4 text-lg font-bold shadow-lg mt-4 ${isLoading ? 'opacity-50 cursor-not-allowed shadow-none' : 'shadow-[#A284C5]/20'}`}>
                {isLoading ? 'Confirming...' : `Confirm Purchase · ₹${cartTotal.toFixed(2)}`}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* AUTHENTICATION MODAL */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center px-4 overflow-hidden">
          <div className="absolute inset-0 bg-[#2A2431]/40 backdrop-blur-sm transition-opacity duration-500" onClick={() => setIsAuthModalOpen(false)} />

          <div className="relative bg-[#F7F5FA] border-2 border-white rounded-[2.5rem] p-10 md:p-14 max-w-sm w-full text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom-12 fade-in duration-500">
            <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/50 text-[#2A2431] transition-all"><X size={20} /></button>
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-[#A284C5]/20">
              {authMode === 'login' ? <Lock size={24} className="text-[#A284C5]" /> : <User size={24} className="text-[#A284C5]" />}
            </div>
            <h2 className="text-3xl font-serif font-bold text-[#2A2431] mb-2">{authMode === 'login' ? 'Welcome Back.' : 'Join Cozy Threads.'}</h2>
            <p className="text-xs text-[#7E6A93] mb-8 uppercase tracking-wider font-bold">Secure your sanctuary</p>
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input name="email" type="email" required placeholder="Email address" className="w-full bg-white pl-12 pr-4 py-4 rounded-xl text-sm outline-none focus:border-[#A284C5] border-2 border-transparent transition-all shadow-sm" />
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input name="password" type="password" required placeholder="Password" minLength="6" className="w-full bg-white pl-12 pr-4 py-4 rounded-xl text-sm outline-none focus:border-[#A284C5] border-2 border-transparent transition-all shadow-sm" />
              </div>
              {authError && <p className="text-[10px] text-red-500 font-bold bg-white/50 p-2 rounded-lg">{authError}</p>}
              <Button type="submit" variant="primary" className="w-full py-4 shadow-xl mt-4">{authMode === 'login' ? 'Sign In' : 'Create Account'}</Button>
            </form>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button type="button" onClick={handleGoogleAuth} className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-100 hover:border-[#A284C5] hover:bg-gray-50 text-gray-600 rounded-xl py-3 text-sm font-bold shadow-sm transition-all focus:outline-none">
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5 object-contain" />
                Continue with Google
              </button>
            </div>
            <div className="mt-6 pt-6 border-t border-[#2A2431]/10">
              <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-xs font-bold text-[#7E6A93] hover:text-[#2A2431] transition-all underline decoration-1 underline-offset-4">
                {authMode === 'login' ? 'First time here? Create an account' : 'Already brewing with us? Sign in'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AESTHETIC SUCCESS MODAL */}
      {successModal.isOpen && (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center px-4 overflow-hidden">
          <div className="absolute inset-0 bg-black/10 transition-opacity duration-1000" onClick={() => setSuccessModal({ isOpen: false })} />

          <div className="relative bg-white border border-[#2A2431]/10 rounded-3xl p-10 md:p-14 max-w-md w-full text-center shadow-[0_20px_60px_-15px_rgba(126,106,147,0.15)] animate-in slide-in-from-bottom-12 fade-in duration-1000">
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-white p-3 rounded-full border border-[#2A2431]/5 shadow-sm">
              <Sparkles size={24} className="text-[#A284C5]" />
            </div>
            <div className="relative z-10 pt-2 flex flex-col items-center">
              <img src="/thank_you_mascots.png" alt="Yay! Thank you" className="w-48 h-48 object-contain mb-4 animate-rich-float" />
              <p className="text-[10px] font-bold text-[#A284C5] uppercase tracking-[0.3em] mb-2">Cozy Threads</p>
              <h2 className="text-3xl md:text-4xl font-serif font-extrabold text-[#2A2431] leading-snug mb-3">{successModal.title}</h2>
              <p className="text-sm text-[#7E6A93] max-w-xs mx-auto mb-6">{successModal.message}</p>
              <div className="w-16 h-[2px] bg-[#A284C5]/40 mx-auto mb-8" />
              <button onClick={() => setSuccessModal({ isOpen: false })} className="group flex items-center justify-center gap-2 mx-auto w-10 h-10 bg-gray-50 hover:bg-[#2A2431] rounded-full transition-all duration-300">
                <X size={16} className="text-gray-400 group-hover:text-white transition-colors" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN IMAGE ZOOM MODAL */}
      {zoomedImage && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center px-4" onClick={() => setZoomedImage(null)}>
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm transition-opacity duration-300" />
          <button onClick={() => setZoomedImage(null)} className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-10"><X size={24} /></button>
          <img src={zoomedImage} alt="Fullscreen product preview" className="relative max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300" />
        </div>
      )}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bubblegum+Sans&family=Nunito:wght@400;600;700;800;900&display=swap');
        body { font-family: 'Nunito', sans-serif; -webkit-tap-highlight-color: transparent; scroll-behavior: smooth; }
        .font-serif { font-family: 'Bubblegum Sans', cursive; letter-spacing: 1px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        @keyframes pureFadeInOut { 
          0% { opacity: 0; } 
          15% { opacity: 1; } 
          70% { opacity: 1; } 
          100% { opacity: 0; } 
        }
        .animate-pure-fade-in-out { animation: pureFadeInOut 4s ease-in-out forwards; }
        
        @keyframes slideInUp12 { from { opacity: 0; transform: translateY(3rem); } to { opacity: 1; transform: translateY(0); } }
        .slide-in-from-bottom-12 { animation: slideInUp12 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes loading-bar { 0% { width: 0%; } 100% { width: 100%; } }
        .animate-loading-bar { animation: loading-bar 2.5s ease-in-out forwards; }
        @keyframes richFloat {
          0%, 100% { transform: translateY(0) scale(1) rotate(0deg); filter: drop-shadow(0 15px 15px rgba(162,132,197,0.4)); }
          50% { transform: translateY(-15px) scale(1.03) rotate(1.5deg); filter: drop-shadow(0 25px 25px rgba(162,132,197,0.15)); }
        }
        .animate-rich-float { animation: richFloat 5s ease-in-out infinite; }
        @keyframes zoomIn95 { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .zoom-in-95 { animation: zoomIn95 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
}
