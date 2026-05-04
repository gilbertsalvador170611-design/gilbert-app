import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { User } from 'firebase/auth';
import { Home, Wallet, User as UserIcon, ListVideo } from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface Props {
  user: User;
}

export default function UserLayout({ user }: Props) {
  const location = useLocation();
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        setBalance(doc.data().walletBalance || 0);
      }
    });
    return () => unsub();
  }, [user]);

  const navItems = [
    { icon: ListVideo, label: 'Feed', path: '/feed' },
    { icon: Wallet, label: 'Wallet', path: '/wallet' },
    { icon: UserIcon, label: 'Profile', path: '/profile' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top Header */}
      <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="font-bold text-xs text-white">AP</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-tight leading-none text-white">AdRewards</span>
            <span className="text-[8px] text-slate-500 font-mono uppercase tracking-tighter">com.adrewards.ph</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-slate-400">Balance</p>
            <p className="text-sm font-bold text-green-400">₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="h-20 border-t border-slate-800 bg-slate-950/80 backdrop-blur-xl fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (location.pathname === '/' && item.path === '/feed');
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center gap-1 group relative py-2 px-6"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 bg-blue-600/10 rounded-2xl"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <item.icon className={`w-6 h-6 transition-colors ${isActive ? 'text-blue-500' : 'text-slate-500 group-hover:text-slate-300'}`} />
              <span className={`text-[10px] uppercase tracking-widest font-bold ${isActive ? 'text-blue-500' : 'text-slate-500 group-hover:text-slate-300'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
