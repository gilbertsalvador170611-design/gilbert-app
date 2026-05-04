import { motion } from 'motion/react';
import { ShieldCheck } from 'lucide-react';

interface Props {
  onComplete: () => void;
}

export default function SplashView({ onComplete }: Props) {
  return (
    <div className="fixed inset-0 bg-slate-950 z-[100] flex items-center justify-center overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ 
          duration: 0.8,
          ease: [0, 0.71, 0.2, 1.01]
        }}
        className="flex flex-col items-center"
      >
        <motion.div
          animate={{ 
            rotateY: [0, 180, 360],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 2, 
            repeat: 0,
            ease: "easeInOut"
          }}
          onAnimationComplete={onComplete}
          className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/40 mb-6"
        >
          <ShieldCheck className="w-12 h-12 text-white" />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-center"
        >
          <h1 className="text-3xl font-black text-white tracking-tighter mb-2">AdRewards Pro</h1>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 justify-center">
              <div className="h-1 w-12 bg-blue-600 rounded-full" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Enterprise Payouts</span>
              <div className="h-1 w-12 bg-blue-600 rounded-full" />
            </div>
            <p className="text-[9px] font-mono text-slate-700 uppercase tracking-[0.2em] mt-4">Powered by com.adrewards.ph</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-1/2 h-1/2 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-1/2 h-1/2 bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />
    </div>
  );
}
