/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import SplashView from './views/SplashView';
import AuthView from './views/AuthView';
import UserLayout from './components/UserApp/Layout';
import AdminLayout from './components/AdminApp/Layout';
import FeedView from './views/UserApp/FeedView';
import WalletView from './views/UserApp/WalletView';
import ProfileView from './views/UserApp/ProfileView';
import AdminDashboard from './views/AdminApp/Dashboard';
import UserManagement from './views/AdminApp/UserManagement';
import WithdrawalManagement from './views/AdminApp/WithdrawalManagement';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSplashing, setIsSplashing] = useState(true);

  useEffect(() => {
    let unsubSnapshot: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setLoading(true);
      setUser(u);
      
      if (unsubSnapshot) {
        unsubSnapshot();
        unsubSnapshot = null;
      }

      if (u) {
        const adminEmail = "bertsalvador227@gmail.com";
        const isAdm = u.email === adminEmail;
        setIsAdmin(isAdm);

        // Fetch user status from Firestore with real-time updates
        const userDocRef = doc(db, 'users', u.uid);
        unsubSnapshot = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            const userData = snap.data();
            setIsApproved(userData.status === 'active' || isAdm);
          } else {
            setIsApproved(false);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user status:", error);
          setLoading(false);
        });
      } else {
        setIsAdmin(false);
        setIsApproved(false);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubSnapshot) unsubSnapshot();
    };
  }, []);

  if (isSplashing) {
    return <SplashView onComplete={() => setIsSplashing(false)} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Route */}
        <Route path="/auth" element={!user ? <AuthView /> : <Navigate to={isAdmin ? "/admin" : "/"} replace />} />

        {/* User App Routes */}
        <Route
          path="/"
          element={
            user ? (
              isAdmin ? (
                <Navigate to="/admin" replace />
              ) : isApproved ? (
                <UserLayout user={user} />
              ) : (
                <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                  <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center shadow-2xl">
                    <div className="w-20 h-20 bg-amber-500/10 text-amber-500 mx-auto rounded-full flex items-center justify-center mb-6">
                      <Loader2 className="w-10 h-10 animate-spin" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Application Pending</h2>
                    <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                      Your account is currently under review by our admin team. This process ensures platform security and usually takes 2-4 hours.
                    </p>
                    <button 
                      onClick={() => auth.signOut()}
                      className="w-full h-12 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all mb-6"
                    >
                      Logout
                    </button>
                    <p className="text-[10px] font-mono text-slate-700 uppercase tracking-widest">com.adrewards.ph</p>
                  </div>
                </div>
              )
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        >
          <Route index element={<FeedView />} />
          <Route path="feed" element={<FeedView />} />
          <Route path="wallet" element={<WalletView />} />
          <Route path="profile" element={<ProfileView />} />
        </Route>

        {/* Admin App Routes */}
        <Route
          path="/admin"
          element={
            isAdmin ? <AdminLayout user={user!} /> : <Navigate to="/" />
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="withdrawals" element={<WithdrawalManagement />} />
        </Route>


        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

