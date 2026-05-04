import React, { useState, useEffect } from 'react';
import { db, auth } from '../../lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { User, Mail, School, Calendar, Phone, Camera, ShieldCheck, Loader2, LogOut } from 'lucide-react';
import { motion } from 'motion/react';

export default function ProfileView() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!auth.currentUser) return;
      const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (snap.exists()) setProfile(snap.data());
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !profile) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        ...profile,
        updatedAt: serverTimestamp(),
      });
      alert('Profile updated!');
    } catch (err) {
      console.error(err);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    auth.signOut();
  };

  if (loading) return <div className="flex items-center justify-center p-20"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>;

  return (
    <div className="px-6 py-8">
      <div className="flex flex-col items-center mb-8">
        <div className="relative group">
          <div className="w-24 h-24 bg-slate-800 rounded-3xl border-2 border-slate-700 flex items-center justify-center overflow-hidden">
            <User className="w-12 h-12 text-slate-500" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="w-6 h-6" />
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 rounded-xl border-4 border-slate-950 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
        </div>
        <h2 className="mt-4 text-2xl font-bold text-white">{profile.name}</h2>
        <div className="inline-flex items-center gap-1.5 bg-slate-800 px-3 py-1 rounded-full mt-2 border border-slate-700">
          <div className={`w-2 h-2 rounded-full ${profile.status === 'active' ? 'bg-green-500' : 'bg-amber-500'}`} />
          <span className="text-[10px] uppercase tracking-widest font-black text-slate-300">{profile.status}</span>
        </div>
      </div>

      <form onSubmit={handleUpdate} className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
            <Mail className="w-5 h-5 text-slate-500" />
            <div className="flex-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Email Address</p>
              <p className="text-white text-sm">{profile.email}</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
            <Phone className="w-5 h-5 text-slate-500" />
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-0.5 block">Phone Number</label>
              <input 
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="bg-transparent text-white text-sm w-full focus:outline-none placeholder:text-slate-700"
                placeholder="+63 9XX XXX XXXX"
              />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
            <School className="w-5 h-5 text-slate-500" />
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-0.5 block">School / University</label>
              <input 
                value={profile.school}
                onChange={(e) => setProfile({ ...profile, school: e.target.value })}
                className="bg-transparent text-white text-sm w-full focus:outline-none placeholder:text-slate-700"
                placeholder="Enter your school"
              />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
            <Calendar className="w-5 h-5 text-slate-500" />
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-0.5 block">Age</label>
              <input 
                type="number"
                value={profile.age}
                onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) || '' })}
                className="bg-transparent text-white text-sm w-full focus:outline-none placeholder:text-slate-700"
                placeholder="Ex. 18"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 flex flex-col gap-3">
          <button 
            type="submit"
            disabled={saving}
            className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-900/20 active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : 'Save Changes'}
          </button>
          
          <button 
            type="button"
            onClick={logout}
            className="w-full h-14 bg-slate-800 hover:bg-red-500/10 hover:text-red-500 text-slate-400 font-bold rounded-2xl transition-all border border-slate-700 flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            Log Out
          </button>
        </div>
      </form>

      <div className="mt-12 bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center">
        <h3 className="font-bold text-lg mb-2 flex items-center justify-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-500" />
          Fraud Protection
        </h3>
        <p className="text-sm text-slate-400 mb-6">Device fingerprinting and behavior monitoring active.</p>
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
          <div className="bg-green-500 h-full w-[15%]" />
        </div>
        <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
          <span>Risk Score</span>
          <span className="text-green-500">{profile.fraudScore || 0} (Normal)</span>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-800">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Device Fingerprint</p>
          <p className="text-[10px] font-mono text-slate-500 break-all">{profile.deviceId || 'Unknown'}</p>
        </div>
        <div className="mt-8 opacity-20 hover:opacity-100 transition-opacity">
          <p className="text-[8px] font-mono text-slate-500 uppercase tracking-[0.3em]">Licensed by com.adrewards.ph</p>
        </div>
      </div>
    </div>
  );
}
