import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { Search, Filter, MoreVertical, CheckCircle, XCircle, Ban, Loader2, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'active' | 'suspended'>('all');

  useEffect(() => {
    const fetchUsers = async () => {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const setStatus = async (userId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { status });
      setUsers(users.map(u => u.id === userId ? { ...u, status } : u));
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || u.status === activeTab;
    return matchesSearch && matchesTab;
  });

  if (loading) return <div className="flex items-center justify-center p-20"><Loader2 className="animate-spin text-indigo-500 w-10 h-10" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800">
          {(['all', 'pending', 'active', 'suspended'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 h-10 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {tab}
            </button>
          ))}
        </div>
        
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-4 text-white focus:outline-none focus:border-indigo-500 transition-all text-sm"
          />
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900 font-bold text-xs uppercase tracking-widest text-slate-500">
              <th className="px-8 py-5">User Profile</th>
              <th className="px-6 py-5">Contact & PH</th>
              <th className="px-6 py-5">Risk Score</th>
              <th className="px-6 py-5">Status</th>
              <th className="px-8 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredUsers.map((user) => (
              <motion.tr 
                layout
                key={user.id} 
                className="hover:bg-slate-800/30 transition-colors group"
              >
                <td className="px-8 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
                      <img src={`https://ui-avatars.com/api/?name=${user.name}&background=6366f1&color=fff`} alt={user.name} />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white">{user.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{user.school || 'Unspecified School'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-xs font-medium text-slate-300">{user.email}</p>
                  <p className="text-[10px] text-slate-500 font-bold">{user.phone || 'No Phone'}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${user.fraudScore > 80 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                      {user.fraudScore || 0}
                    </div>
                    {user.fraudScore > 80 && <ShieldAlert className="w-4 h-4 text-red-500" />}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase ${
                    user.status === 'active' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                    user.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                    'bg-slate-500/10 text-slate-500 border-slate-500/20'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      user.status === 'active' ? 'bg-green-500' : 
                      user.status === 'pending' ? 'bg-amber-500' : 'bg-slate-500'
                    }`} />
                    {user.status}
                  </div>
                </td>
                <td className="px-8 py-4 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {user.status === 'pending' && (
                      <button 
                        onClick={() => setStatus(user.id, 'active')}
                        title="Approve"
                        className="w-10 h-10 bg-green-600/10 text-green-500 hover:bg-green-600 hover:text-white rounded-xl flex items-center justify-center transition-all"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    )}
                    {user.status === 'active' && (
                      <button 
                        onClick={() => setStatus(user.id, 'suspended')}
                        title="Suspend"
                        className="w-10 h-10 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white rounded-xl flex items-center justify-center transition-all"
                      >
                        <Ban className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
