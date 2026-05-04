import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, PhilippinePeso, Timer, ShieldCheck, AlertTriangle } from 'lucide-react';
import { db, auth } from '../../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const MOCK_ADS = [
  {
    id: 'ad1',
    title: 'Super Gamer 3000',
    description: 'Experience the next generation of mobile gaming with Super Gamer 3000.',
    color: 'from-purple-600 to-blue-600',
    reward: 1.50,
    duration: 15,
  },
  {
    id: 'ad2',
    title: 'EcoFood Delivery',
    description: 'Fresh organic food delivered to your doorstep in 15 minutes.',
    color: 'from-emerald-600 to-teal-600',
    reward: 2.25,
    duration: 30,
  },
  {
    id: 'ad3',
    title: 'Zen Meditation App',
    description: 'Find your inner peace with curated daily meditation sessions.',
    color: 'from-amber-500 to-orange-600',
    reward: 3.50,
    duration: 45,
  }
];

export default function FeedView() {
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [userStatus, setUserStatus] = useState<string>('pending');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const hasTriggeredRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!auth.currentUser) return;
    
    // Real-time status update within the view
    const unsub = onSnapshot(doc(db, 'users', auth.currentUser.uid), (snap) => {
      if (snap.exists()) {
        setUserStatus(snap.data().status);
      }
    });
    return unsub;
  }, []);

  const currentAd = MOCK_ADS[index];

  const handleVerifyAd = async (currentProgress: number) => {
    if (!auth.currentUser || hasTriggeredRef.current[currentAd.id] || isVerifying) return;
    
    setIsVerifying(true);
    hasTriggeredRef.current[currentAd.id] = true;

    try {
      // Get the fresh ID token from Firebase
      const token = await auth.currentUser.getIdToken(true);
      
      const response = await fetch('/api/verify-ad', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          adId: currentAd.id,
          reward: currentAd.reward,
          progress: currentProgress
        }),
      });

      if (response.ok) {
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
        }, 1000); // 1 second feedback for TikTok-style feel
      } else {
        const errorText = await response.text();
        let errorMsg = 'Please try again later';
        try {
          const errorData = JSON.parse(errorText);
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          errorMsg = `Server Error (${response.status})`;
        }
        console.warn('Verification issue:', errorMsg);
      }
    } catch (err) {
      console.warn('verification call failed');
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    let interval: any;
    if (isPlaying && progress < 100 && userStatus === 'active') {
      interval = setInterval(() => {
        setProgress(prev => {
          const next = Math.min(prev + (100 / (currentAd.duration * 10)), 100);
          
          // Trigger verification at 90%
          if (next >= 90 && !hasTriggeredRef.current[currentAd.id] && !isVerifying) {
            handleVerifyAd(next);
          }
          
          return next;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, progress, currentAd, userStatus, isVerifying]);

  const handleNext = () => {
    setProgress(0);
    setIndex((index + 1) % MOCK_ADS.length);
    setIsPlaying(true);
    setShowSuccess(false);
  };

  const handlePrev = () => {
    setProgress(0);
    setIndex((index - 1 + MOCK_ADS.length) % MOCK_ADS.length);
    setIsPlaying(true);
    setShowSuccess(false);
  };

  return (
    <div className="h-[calc(100vh-144px)] relative overflow-hidden bg-black">
      {userStatus !== 'active' && (
        <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-amber-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Account Pending Approval</h2>
          <p className="text-slate-400 max-w-xs">
            Admin must approve your account before you can start watching ads and earning rewards.
          </p>
          <div className="mt-8 p-4 bg-slate-900 rounded-2xl border border-slate-800 text-sm italic text-slate-500">
            Current Status: <span className="text-amber-500 font-bold uppercase">{userStatus}</span>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentAd.id}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '-100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={`absolute inset-0 bg-gradient-to-br ${currentAd.color} flex flex-col justify-end p-8`}
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {/* Ad Content Simulation */}
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold mb-4">
              <ShieldCheck className="w-3 h-3 text-blue-300" />
              Verified Ad
            </div>
            <h2 className="text-4xl font-extrabold text-white mb-2 tracking-tight">
              {currentAd.title}
            </h2>
            <p className="text-white/80 text-lg max-w-sm mb-6">
              {currentAd.description}
            </p>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10">
                <PhilippinePeso className="w-5 h-5 text-green-400" />
                <span className="font-bold text-xl">₱{currentAd.reward.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10">
                <Timer className="w-5 h-5 text-blue-400" />
                <span className="font-bold">{currentAd.duration}s</span>
              </div>
            </div>
          </div>

          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/20">
                <Play className="w-10 h-10 text-white translate-x-1" />
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
        <motion.div 
          className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls Overlay */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-6">
        <button 
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
          className="w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 hover:bg-black/60 transition-colors"
        >
          <motion.div animate={{ rotate: -90 }}>➤</motion.div>
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
          className="w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 hover:bg-black/60 transition-colors"
        >
          <motion.div animate={{ rotate: 90 }}>➤</motion.div>
        </button>
      </div>

      {/* Reward Notification */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="bg-black/90 backdrop-blur-xl border border-white/10 px-8 py-6 rounded-[2.5rem] text-center shadow-2xl flex flex-col items-center">
              <motion.div 
                initial={{ rotate: -15, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', damping: 12 }}
                className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(16,185,129,0.5)]"
              >
                <PhilippinePeso className="w-8 h-8 text-white" />
              </motion.div>
              <h3 className="text-xl font-bold text-white mb-1">Ad Completed!</h3>
              <div className="text-2xl font-black text-emerald-400">
                +₱{currentAd.reward.toFixed(2)}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
