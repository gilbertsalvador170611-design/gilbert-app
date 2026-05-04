import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, updateDoc, query, orderBy, where, getDoc } from 'firebase/firestore';
import { CreditCard, CheckCircle, XCircle, Clock, Loader2, ArrowUpRight, Smartphone, Banknote, Landmark } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function WithdrawalManagement() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'processed'>('pending');

  const fetchRequests = async () => {
    setLoading(true);
    const q = query(collection(db, 'withdrawals'), orderBy('requestedAt', 'desc'));
    const snap = await getDocs(q);
    
    const docs = await Promise.all(snap.docs.map(async (d) => {
      const data = d.data();
      const userSnap = await getDoc(doc(db, 'users', data.userId));
      const userData = userSnap.exists() ? userSnap.data() : null;
      return {
        id: d.id,
        ...data,
        userName: userData ? userData.name : 'Unknown User',
        userEmail: userData ? userData.email : 'Unknown Email',
        userFraudScore: userData ? userData.fraudScore : 0,
        userDeviceId: userData ? userData.deviceId : 'N/A',
      };
    }));
    
    setRequests(docs);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (id: string, status: string, requestedAt: any) => {
    if (status === 'approved') {
      const waitTime = 1 * 60 * 60 * 1000; // 1 hour in ms
      const timeElapsed = Date.now() - requestedAt.toDate().getTime();
      if (timeElapsed < waitTime) {
        const remainingMinutes = Math.ceil((waitTime - timeElapsed) / (60 * 1000));
        alert(`Cannot approve yet. Please wait ${remainingMinutes} more minutes (Min: 1 hour review).`);
        return;
      }
    }
    
    try {
      await updateDoc(doc(db, 'withdrawals', id), { 
        status,
        processedAt: new Date(),
      });
      setRequests(requests.map(r => r.id === id ? { ...r, status } : r));
    } catch (err) {
      console.error(err);
      alert('Failed to update status. Ensure 1 hour has passed for approvals.');
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'GCash': return Smartphone;
      case 'Maya': return Landmark;
      default: return Banknote;
    }
  };

  if (loading) return <div className="flex items-center justify-center p-20"><Loader2 className="animate-spin text-indigo-500 w-10 h-10" /></div>;

  const currentRequests = requests.filter(r => 
    activeTab === 'pending' ? r.status === 'pending' : r.status !== 'pending'
  );

  return (
    <div className="space-y-8">
      <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 w-fit">
        {(['pending', 'processed'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-8 h-10 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {currentRequests.map((req, idx) => {
            const Icon = getMethodIcon(req.method);
            return (
              <motion.div
                key={req.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                    req.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                    req.status === 'approved' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                    'bg-red-500/10 text-red-500 border-red-500/20'
                  }`}>
                    {req.status}
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700">
                    <Icon className="w-7 h-7 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-black text-2xl text-white tracking-tighter">₱{req.amount.toFixed(2)}</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase">{req.method}</p>
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-bold uppercase">Recipient</span>
                    <span className="text-slate-100 font-bold">{req.fullName}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-bold uppercase">Phone</span>
                    <span className="text-indigo-400 font-black tracking-widest">{req.phone}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-bold uppercase">User Email</span>
                    <span className="text-slate-400 font-medium truncate ml-4 italic group-hover:text-slate-200 transition-colors">{req.userEmail}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-bold uppercase">Date</span>
                    <span className="text-slate-300 font-medium">{req.requestedAt?.toDate().toLocaleString()}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-slate-600 tracking-tighter">Fraud Signal</span>
                    <div className="flex items-center gap-2">
                       <span className={`text-[10px] font-black ${req.userFraudScore > 50 ? 'text-red-500' : 'text-green-500'}`}>Score: {req.userFraudScore}</span>
                       <span className="text-[8px] font-mono text-slate-700">{req.userDeviceId.substring(0, 8)}...</span>
                    </div>
                  </div>
                </div>

                {req.status === 'pending' && (
                  <div className="space-y-3">
                    {(() => {
                      const waitTime = 1 * 60 * 60 * 1000;
                      const timeElapsed = Date.now() - req.requestedAt.toDate().getTime();
                      const isReady = timeElapsed >= waitTime;
                      const remainingMinutes = Math.ceil((waitTime - timeElapsed) / (60 * 1000));
                      
                      return (
                        <>
                          {!isReady && (
                            <div className="flex items-center gap-2 text-[10px] font-bold text-amber-500 uppercase tracking-widest bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                              <Clock className="w-3 h-3" />
                              Under Review: {remainingMinutes}m remaining
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-3">
                            <button 
                              onClick={() => handleAction(req.id, 'approved', req.requestedAt)}
                              disabled={!isReady}
                              className={`h-12 text-white font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${
                                isReady ? 'bg-green-600 hover:bg-green-500' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </button>
                            <button 
                              onClick={() => handleAction(req.id, 'rejected', req.requestedAt)}
                              className="h-12 bg-slate-800 hover:bg-red-600/10 hover:text-red-500 text-slate-400 font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                              <XCircle className="w-4 h-4" />
                              Reject
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
                
                {req.status !== 'pending' && req.processedAt && (
                   <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase">
                     <span>Processed At</span>
                     <span>{req.processedAt instanceof Date ? req.processedAt.toLocaleString() : (req.processedAt.toDate ? req.processedAt.toDate().toLocaleString() : 'N/A')}</span>
                   </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {requests.length === 0 && (
        <div className="text-center py-20 bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl">
          <CreditCard className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500 font-bold">No withdrawal requests found.</p>
        </div>
      )}
    </div>
  );
}
