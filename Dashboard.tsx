import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { Users, CreditCard, TrendingUp, ShieldAlert, Clock, CheckCircle2, UserCheck, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingWithdrawals: 0,
    totalWithdrawals: 0,
    revenue: 0,
    fraudAlerts: 0,
  });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [highRiskUsers, setHighRiskUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch all users for counting
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersList = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        
        // Fetch all withdrawals for counting and revenue
        const withdrawalsSnap = await getDocs(collection(db, 'withdrawals'));
        const withdrawalsList = withdrawalsSnap.docs.map(d => d.data());

        // Calculate stats
        const totalUsers = usersSnap.size;
        const pendingWithdrawals = withdrawalsList.filter(w => w.status === 'pending').length;
        const totalWithdrawals = withdrawalsList.filter(w => w.status === 'approved').length;
        const revenue = withdrawalsList.filter(w => w.status === 'approved').reduce((acc, w) => acc + (w.amount || 0), 0);
        const fraudAlerts = usersList.filter(u => (u.fraudScore || 0) > 80).length;

        setStats({
          totalUsers,
          pendingWithdrawals,
          totalWithdrawals,
          revenue,
          fraudAlerts,
        });

        // Set recent users
        setRecentUsers(usersList.slice(0, 3));

        // Set high risk users
        setHighRiskUsers(usersList.filter(u => (u.fraudScore || 0) > 50).slice(0, 2));

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Total Payouts', value: `₱${stats.revenue.toLocaleString()}`, icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Pending Payouts', value: stats.pendingWithdrawals, icon: CreditCard, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Fraud Alerts', value: stats.fraudAlerts, icon: ShieldAlert, color: 'text-red-500', bg: 'bg-red-500/10' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl"
          >
            <div className={`w-12 h-12 ${card.bg} ${card.color} rounded-2xl flex items-center justify-center mb-4`}>
              <card.icon className="w-6 h-6" />
            </div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{card.label}</p>
            <h3 className="text-3xl font-black text-white mt-1">{card.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Recent Approvals */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-xl flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-500" />
              Latest Registered Users
            </h3>
            <Link to="/admin/users" className="text-xs font-bold text-indigo-500 hover:text-indigo-400">View All</Link>
          </div>
          <div className="space-y-4">
            {recentUsers.length > 0 ? recentUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
                    <img src={`https://ui-avatars.com/api/?name=${user.name}&background=6366f1&color=fff`} alt="user" />
                  </div>
                  <div>
                    <p className="font-bold text-sm truncate max-w-[150px]">{user.name}</p>
                    <p className="text-[10px] text-slate-500 truncate max-w-[150px]">{user.email}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${
                  user.status === 'active' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                  user.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                  'bg-slate-500/10 text-slate-500 border-slate-500/20'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    user.status === 'active' ? 'bg-green-500' : 
                    user.status === 'pending' ? 'bg-amber-500' : 'bg-slate-500'
                  }`} />
                  <span className="text-[10px] font-black uppercase">{user.status}</span>
                </div>
              </div>
            )) : (
              <div className="text-center py-10 text-slate-500 text-sm italic">No users found</div>
            )}
          </div>
        </div>

        {/* System Health */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-xl flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              Security Awareness
            </h3>
            <span className="text-[10px] font-bold text-slate-500 uppercase px-3 py-1 bg-slate-800 rounded-full">Risk Analysis</span>
          </div>
          <div className="space-y-6">
            {highRiskUsers.length > 0 ? highRiskUsers.map((user) => (
              <div key={user.id} className="flex gap-4">
                <div className="w-12 h-12 bg-amber-500/10 text-amber-500 flex-shrink-0 rounded-2xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-sm mb-1 text-white">High Risk Score Detected: {user.fraudScore}</p>
                  <p className="text-xs text-slate-400 leading-relaxed font-mono">User {user.name} ({user.id.substring(0,6)}) has been flagged for abnormal activity.</p>
                  <div className="mt-2 flex gap-2">
                    <button className="text-[10px] font-black uppercase bg-red-600 px-3 py-1 rounded-md text-white">Review Auth</button>
                    <button className="text-[10px] font-black uppercase bg-slate-800 px-3 py-1 rounded-md text-slate-400 italic">{user.deviceId?.substring(0,8)}...</button>
                  </div>
                </div>
              </div>
            )) : (
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-green-500/10 text-green-500 flex-shrink-0 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-sm mb-1 text-white">No Critical Threats</p>
                  <p className="text-xs text-slate-400 leading-relaxed">System is running within normal parameters. No users reached critical fraud threshold.</p>
                </div>
              </div>
            )}
            
            <div className="pt-4 border-t border-slate-800">
               <div className="flex items-center gap-2 mb-2">
                 <ShieldAlert className="w-4 h-4 text-blue-500" />
                 <p className="font-bold text-xs text-white uppercase tracking-tighter">System Health Status</p>
               </div>
               <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                 <div className="w-[98%] h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
               </div>
               <div className="flex justify-between mt-2">
                 <p className="text-[10px] text-slate-500 font-bold uppercase">Optimal Performance</p>
                 <p className="text-[10px] text-indigo-400 font-black">98.4%</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
