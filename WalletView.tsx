import { useState, useEffect } from 'react';
import { db, auth } from '../../lib/firebase';
import { collection, query, where, orderBy, getDocs, doc, getDoc, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { Wallet, ArrowUpRight, History, CreditCard, Landmark, Banknote, Loader2, CheckCircle2, XCircle, Clock, Smartphone } from 'lucide-react';
import { motion } from 'motion/react';

export default function WalletView() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+63');

  useEffect(() => {
    if (!auth.currentUser) return;

    // Real-time Balance Update via onSnapshot
    const userDocRef = doc(db, 'users', auth.currentUser.uid);
    const unsubUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBalance(data.walletBalance || 0);
        if (data.name) setFullName(data.name);
        if (data.phone) setPhone(data.phone);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching user data:", error);
      setLoading(false);
    });

    // Fetch Transactions (One-time fetch or onSnapshot?)
    // Using onSnapshot for Transactions too if real-time is desired
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    
    const unsubTransactions = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.error("Error fetching transactions:", error);
    });

    return () => {
      unsubUser();
      unsubTransactions();
    };
  }, []);

  const handleWithdraw = async () => {
    if (!auth.currentUser || !withdrawAmount || !withdrawMethod || !fullName || !phone) {
      return alert('Please complete all fields');
    }

    if (!phone.startsWith('+63') || phone.length !== 13) {
      return alert('Please use valid Philippine format (+63XXXXXXXXXX)');
    }

    const amount = parseFloat(withdrawAmount);
    if (amount < 100) return alert('Minimum withdrawal is ₱100');
    if (amount > balance) return alert('Insufficient balance');

    setWithdrawing(true);
    try {
      await addDoc(collection(db, 'withdrawals'), {
        userId: auth.currentUser.uid,
        amount,
        fullName,
        phone,
        method: withdrawMethod,
        status: 'pending',
        requestedAt: serverTimestamp(),
      });
      alert('Withdrawal request submitted! Pending admin approval.');
      setWithdrawing(false);
      setWithdrawAmount('');
      setWithdrawMethod('');
    } catch (err) {
      console.error(err);
      alert('Failed to submit withdrawal');
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="px-6 py-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-blue-600 rounded-3xl p-8 mb-8 shadow-xl shadow-blue-600/20"
      >
        <div className="flex items-center justify-between mb-4">
          <Wallet className="w-8 h-8 text-blue-100" />
          <span className="text-sm font-medium text-blue-100 opacity-80 uppercase tracking-widest">Total Earnings</span>
        </div>
        <h1 className="text-5xl font-black text-white tracking-tighter mb-2">
          ₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
        </h1>
        <p className="text-blue-100 text-sm opacity-60">Available for withdrawal</p>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 mb-12">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <ArrowUpRight className="w-5 h-5 text-green-500" />
            <h2 className="font-bold text-xl">Withdraw Funds</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-500 font-bold uppercase mb-2 block">Recipient Full Name</label>
              <input 
                type="text"
                placeholder="Juan Dela Cruz"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full h-14 bg-slate-800 border border-slate-700 rounded-xl px-4 text-white focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="text-xs text-slate-500 font-bold uppercase mb-2 block">GCash / PayMaya Number</label>
              <input 
                type="text"
                placeholder="+639XXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-14 bg-slate-800 border border-slate-700 rounded-xl px-4 text-white focus:outline-none focus:border-blue-500 transition-all font-mono"
              />
            </div>

            <div>
              <label className="text-xs text-slate-500 font-bold uppercase mb-2 block">Select Amount</label>
              <div className="grid grid-cols-3 gap-2">
                {[100, 500, 1000].map(amt => (
                  <button 
                    key={amt}
                    onClick={() => setWithdrawAmount(amt.toString())}
                    className={`h-12 rounded-xl text-sm font-bold border transition-all ${withdrawAmount === amt.toString() ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                  >
                    ₱{amt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500 font-bold uppercase mb-2 block">Custom Amount (Min ₱100)</label>
              <input 
                type="number"
                placeholder="100.00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="w-full h-14 bg-slate-800 border border-slate-700 rounded-xl px-4 text-white focus:outline-none focus:border-blue-500 transition-all font-mono"
              />
            </div>

            <div>
              <label className="text-xs text-slate-500 font-bold uppercase mb-2 block">Method</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'GCash', icon: Smartphone },
                  { id: 'Maya', icon: Landmark },
                  { id: 'PayPal', icon: Banknote },
                ].map(m => (
                  <button 
                    key={m.id}
                    onClick={() => setWithdrawMethod(m.id)}
                    className={`h-16 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all ${withdrawMethod === m.id ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                  >
                    <m.icon className="w-5 h-5" />
                    <span className="text-[10px] font-bold">{m.id}</span>
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={handleWithdraw}
              disabled={withdrawing || !withdrawAmount || !withdrawMethod || balance < parseFloat(withdrawAmount)}
              className="w-full h-14 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              {withdrawing ? <Loader2 className="animate-spin w-5 h-5" /> : 'Request Payout'}
            </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <History className="w-5 h-5 text-blue-500" />
            <h2 className="font-bold text-xl">Recent Transactions</h2>
          </div>

          <div className="space-y-4">
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">No transactions yet</div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'earning' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {tx.type === 'earning' ? <CheckCircle2 className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white">{tx.description}</p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        {tx.createdAt?.toDate().toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-black text-sm ${tx.type === 'earning' ? 'text-green-500' : 'text-slate-300'}`}>
                      {tx.type === 'earning' ? '+' : '-'} ₱{tx.amount.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">
                      {tx.type}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <div className="text-center pb-8">
        <p className="text-[9px] font-mono text-slate-700 uppercase tracking-[0.2em]">Partnered with com.adrewards.ph</p>
      </div>
    </div>
  );
}
