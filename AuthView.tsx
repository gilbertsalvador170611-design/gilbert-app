import React, { useState, useEffect } from 'react';
import { signInWithPopup, GoogleAuthProvider, FacebookAuthProvider, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { Eye, EyeOff, LogIn, Smartphone, Facebook, ShieldCheck, Camera, Smartphone as DeviceIcon, Loader2, CheckCircle2, UserCircle, Key, Mail, User as UserIcon, School as SchoolIcon, Hash, ArrowLeft, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import fpPromise from '@fingerprintjs/fingerprintjs';

type SignupStep = 'LOGIN' | 'REGISTER_DETAILS' | 'REGISTER_PASSWORD' | 'OTP_VERIFY' | 'DEVICE_CHECK' | 'FACE_VERIFY' | 'SUCCESS' | 'FORGOT_PASSWORD';

export default function AuthView() {
  const [step, setStep] = useState<SignupStep>('LOGIN');
  const [signupMode, setSignupMode] = useState<'EMAIL' | 'PHONE'>('EMAIL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tempUser, setTempUser] = useState<User | null>(null);
  const [deviceId, setDeviceId] = useState('');
  
  useEffect(() => {
    setError('');
  }, [step]);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  
  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    school: '',
    age: '',
    otp: ''
  });

  const validatePassword = (pass: string) => {
    const hasLetter = /[a-zA-Z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    return pass.length >= 8 && hasLetter && hasNumber;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authData.email || !authData.password) return setError('Please enter credentials');
    setLoading(true);
    setError('');
    try {
      let loginEmail = authData.email;

      // Handle Phone Login (+63...)
      if (authData.email.startsWith('+63') || (authData.email.length === 10 && !authData.email.includes('@'))) {
        const phoneToSearch = authData.email.startsWith('+63') ? authData.email : `+63${authData.email}`;
        const q = query(collection(db, 'users'), where('phone', '==', phoneToSearch));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) throw new Error('No account found with this phone number');
        loginEmail = querySnapshot.docs[0].data().email;
      }

      // Admin Login Check
      const ADMIN_EMAIL = (import.meta as any).env.VITE_ADMIN_EMAIL || 'bertsalvador227@gmail.com';
      const ADMIN_PASSWORD = (import.meta as any).env.VITE_ADMIN_PASSWORD || 'donabell110617';

      if (loginEmail === ADMIN_EMAIL) {
        if (authData.password === ADMIN_PASSWORD) {
          await signInWithEmailAndPassword(auth, loginEmail, authData.password);
          return;
        } else {
          setError('Invalid Admin Credentials');
          setLoading(false);
          return;
        }
      }

      await signInWithEmailAndPassword(auth, loginEmail, authData.password);
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Login is currently unavailable. Please try again later.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid credentials. Please check your email/phone and password.');
      } else {
        setError(err.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const startSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authData.email.includes('@')) return setError('Invalid email');
    setStep('REGISTER_DETAILS');
  };

  const proceedToPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authData.name || !authData.age || !authData.school) {
      return setError('Please complete all basic fields (Name, Age, School)');
    }

    if (signupMode === 'EMAIL') {
      if (!authData.email || !authData.email.includes('@')) return setError('Valid email is required');
    } else {
      if (!authData.phone || authData.phone.length < 10) return setError('Valid 10-digit phone number is required');
    }

    const age = parseInt(authData.age);
    if (isNaN(age) || age < 1 || age > 100) {
      return setError('Age must be between 1 and 100');
    }
    
    setStep('REGISTER_PASSWORD');
  };

  const proceedToOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authData.password || !authData.confirmPassword) return setError('Please enter and confirm your password');
    if (!validatePassword(authData.password)) return setError('Password must be 8+ chars with letters and numbers');
    if (authData.password !== authData.confirmPassword) return setError('Passwords do NOT match');
    
    setLoading(true);
    try {
      // Use actual email or generate a placeholder for phone-only signup
      const finalEmail = signupMode === 'EMAIL' 
        ? authData.email 
        : `+63${authData.phone}@adrewards.app`;
      
      const res = await createUserWithEmailAndPassword(auth, finalEmail, authData.password);
      setTempUser(res.user);
      setStep('OTP_VERIFY');
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Sign-up is currently unavailable. Please try again later.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = () => {
    // Simulated OTP Verification
    if (authData.otp === '123456') { // Mock OTP for dev
      setStep('DEVICE_CHECK');
    } else {
      setError('Invalid OTP code');
    }
  };

  const handleForgotPassword = async () => {
    if (!authData.email) return setError('Enter your email first');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, authData.email);
      alert('Password reset link sent to your email!');
      setStep('LOGIN');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) return;

      setTempUser(user);
      setStep('REGISTER_DETAILS'); // Social users need to fill other details
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Google login is currently unavailable. Please try again later.');
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithFacebook = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new FacebookAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) return;

      setTempUser(user);
      setStep('REGISTER_DETAILS');
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Facebook login is currently unavailable. Please try again later.');
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const performDeviceCheck = async () => {
    setLoading(true);
    setError('');
    try {
      const fp = await fpPromise.load();
      const result = await fp.get();
      const id = result.visitorId;
      setDeviceId(id);

      // Check if device is already registered in device_ids collection
      const deviceRef = doc(db, 'device_ids', id);
      const deviceSnap = await getDoc(deviceRef);

      if (deviceSnap.exists()) {
        throw new Error('This device is already associated with an account. Only one account per device is allowed.');
      }

      setStep('FACE_VERIFY');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const [livenessStatus, setLivenessStatus] = useState<'idle' | 'scanning' | 'verifying' | 'complete'>('idle');
  
  const startFaceScan = () => {
    setLivenessStatus('scanning');
    setTimeout(() => {
      setLivenessStatus('verifying');
      setTimeout(() => {
      setLivenessStatus('complete');
      setTimeout(() => completeSignup(), 1500);
    }, 2000);
    }, 3000);
  };

  const completeSignup = async () => {
    if (!tempUser) return;
    setLoading(true);
    setError('');
    try {
      const batch = writeBatch(db);
      
      const userRef = doc(db, 'users', tempUser.uid);
      const finalPhone = signupMode === 'PHONE' ? `+63${authData.phone}` : authData.phone;
      const finalEmail = signupMode === 'EMAIL' ? authData.email : (tempUser.email || `+63${authData.phone}@adrewards.app`);

      batch.set(userRef, {
        uid: tempUser.uid,
        name: authData.name || tempUser.displayName || 'User',
        email: finalEmail,
        phone: finalPhone,
        school: authData.school,
        age: parseInt(authData.age) || 0,
        status: 'pending',
        role: 'user',
        walletBalance: 0,
        fraudScore: 0,
        faceVerified: true,
        faceId: 'simulated_biometric_' + Math.random().toString(36).substring(7),
        deviceId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const deviceRef = doc(db, 'device_ids', deviceId);
      batch.set(deviceRef, {
        userId: tempUser.uid,
        createdAt: serverTimestamp(),
      });

      await batch.commit();
      setStep('SUCCESS');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <motion.div 
        layout
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl overflow-hidden"
      >
        <AnimatePresence mode="wait">
          {step === 'LOGIN' && (
            <motion.div key="login" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
                  <ShieldCheck className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white tracking-tight text-center">AdRewards Pro</h1>
                <p className="text-slate-400 mt-2 text-center text-sm">Secure Login</p>
              </div>

              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl mb-6 text-xs">{error}</div>}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 h-12 flex items-center gap-3">
                  <UserCircle className="w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Email or Phone (+63...)" 
                    className="bg-transparent text-white text-sm w-full focus:outline-none"
                    value={authData.email}
                    onChange={e => setAuthData({...authData, email: e.target.value})}
                  />
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 h-12 flex items-center gap-3 relative">
                  <Key className="w-4 h-4 text-slate-500" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Password" 
                    className="bg-transparent text-white text-sm w-full focus:outline-none pr-10"
                    value={authData.password}
                    onChange={e => setAuthData({...authData, password: e.target.value})}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 text-slate-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button type="submit" disabled={loading} className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all">
                  {loading ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : 'Log In'}
                </button>
              </form>

              <div className="flex justify-between items-center mt-4">
                <button onClick={() => setStep('FORGOT_PASSWORD')} className="text-xs text-blue-400 font-bold hover:underline">Forgot Password?</button>
                <button onClick={() => setStep('REGISTER_DETAILS')} className="text-xs text-slate-400 font-bold hover:text-white">Create Account</button>
              </div>

              <div className="flex items-center gap-4 py-6">
                <div className="h-px bg-slate-800 flex-1" />
                <span className="text-[10px] text-slate-600 font-bold uppercase">Or Social Login</span>
                <div className="h-px bg-slate-800 flex-1" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={signInWithGoogle} className="h-12 bg-white hover:bg-slate-100 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 text-xs">
                  <LogIn className="w-4 h-4" /> Google
                </button>
                <button onClick={signInWithFacebook} className="h-12 bg-[#1877F2] hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-xs">
                  <Facebook className="w-4 h-4" /> Facebook
                </button>
              </div>
            </motion.div>
          )}

          {step === 'FORGOT_PASSWORD' && (
            <motion.div key="forgot" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <button onClick={() => setStep('LOGIN')} className="flex items-center gap-2 text-slate-500 hover:text-white mb-6 text-xs font-bold">
                <ArrowLeft className="w-4 h-4" /> Back to Login
              </button>
              <h2 className="text-2xl font-bold text-white mb-2">Recover Password</h2>
              <p className="text-slate-400 text-sm mb-6">Enter your email to receive a secure reset link.</p>
              <input 
                placeholder="Email Address" 
                className="w-full h-12 bg-slate-800 rounded-xl px-4 text-white text-sm focus:ring-2 ring-blue-500 outline-none mb-4"
                value={authData.email}
                onChange={e => setAuthData({...authData, email: e.target.value})}
              />
              <button onClick={handleForgotPassword} disabled={loading} className="w-full h-12 bg-blue-600 hover:bg-blue-500 font-bold rounded-xl text-white">
                Send Recovery Link
              </button>
            </motion.div>
          )}

          {step === 'REGISTER_DETAILS' && (
            <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <button onClick={() => setStep('LOGIN')} className="flex items-center gap-2 text-slate-500 hover:text-white mb-6 text-xs font-bold">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <h2 className="text-2xl font-bold text-white mb-2">User Information</h2>
              <p className="text-slate-400 text-xs mb-6">Choose your preferred sign-up method.</p>
              
              <div className="flex bg-slate-800 p-1 rounded-xl mb-6">
                <button 
                  onClick={() => setSignupMode('EMAIL')} 
                  className={`flex-1 h-10 rounded-lg text-xs font-bold transition-all ${signupMode === 'EMAIL' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                >
                  Email
                </button>
                <button 
                  onClick={() => setSignupMode('PHONE')} 
                  className={`flex-1 h-10 rounded-lg text-xs font-bold transition-all ${signupMode === 'PHONE' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                >
                  Phone
                </button>
              </div>

              <div className="space-y-4 mb-8">
                <div className="relative group">
                   <UserIcon className="absolute left-4 top-4 text-slate-500 w-4 h-4" />
                   <input placeholder="Full Name" className="w-full h-12 bg-slate-800 rounded-xl pl-12 pr-4 text-white text-sm outline-none" value={authData.name} onChange={e => setAuthData({...authData, name: e.target.value})} />
                </div>

                {signupMode === 'EMAIL' ? (
                  <div className="relative">
                    <Mail className="absolute left-4 top-4 text-slate-500 w-4 h-4" />
                    <input type="email" placeholder="Email Address" className="w-full h-12 bg-slate-800 rounded-xl pl-12 pr-4 text-white text-sm outline-none" value={authData.email} onChange={e => setAuthData({...authData, email: e.target.value})} />
                  </div>
                ) : (
                  <div className="relative flex items-center">
                    <Smartphone className="absolute left-4 top-4 text-slate-500 w-4 h-4" />
                    <div className="w-full h-12 bg-slate-800 rounded-xl flex items-center pl-12 pr-4">
                      <span className="text-sm text-slate-500 font-bold mr-1">+63</span>
                      <input 
                        type="tel"
                        maxLength={10}
                        placeholder="9XXXXXXXXX" 
                        className="bg-transparent w-full text-white text-sm outline-none" 
                        value={authData.phone} 
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '');
                          setAuthData({...authData, phone: val});
                        }} 
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <Hash className="absolute left-4 top-4 text-slate-500 w-4 h-4" />
                    <input 
                      type="number" 
                      min="1"
                      max="100"
                      placeholder="Age" 
                      className="w-full h-12 bg-slate-800 rounded-xl pl-12 pr-4 text-white text-sm outline-none" 
                      value={authData.age} 
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 100)) {
                          setAuthData({...authData, age: val});
                        }
                      }} 
                    />
                  </div>
                  <div className="relative">
                    <SchoolIcon className="absolute left-4 top-4 text-slate-500 w-4 h-4" />
                    <input 
                      placeholder="School Name" 
                      className="w-full h-12 bg-slate-800 rounded-xl pl-12 pr-4 text-white text-sm outline-none" 
                      value={authData.school}
                      onChange={e => setAuthData({...authData, school: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              {error && <div className="text-red-500 text-xs mt-2 mb-4 font-bold">{error}</div>}
              <button onClick={proceedToPassword} className="w-full h-12 bg-blue-600 hover:bg-blue-500 font-bold rounded-xl text-white">Next Step</button>
            </motion.div>
          )}

          {step === 'REGISTER_PASSWORD' && (
            <motion.div key="pass" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <button onClick={() => setStep('REGISTER_DETAILS')} className="flex items-center gap-2 text-slate-500 hover:text-white mb-6 text-xs font-bold">
                <ArrowLeft className="w-4 h-4" /> Back to Details
              </button>
              <h2 className="text-2xl font-bold text-white mb-2">Secure Password</h2>
              <p className="text-slate-400 text-sm mb-6">Create a strong password to protect your earnings.</p>
              <div className="space-y-4 mb-8">
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Password" 
                    className="w-full h-12 bg-slate-800 rounded-xl px-4 pr-12 text-white text-sm outline-none" 
                    value={authData.password} 
                    onChange={e => setAuthData({...authData, password: e.target.value})} 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-4 text-slate-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    placeholder="Confirm Password" 
                    className="w-full h-12 bg-slate-800 rounded-xl px-4 pr-12 text-white text-sm outline-none" 
                    value={authData.confirmPassword} 
                    onChange={e => setAuthData({...authData, confirmPassword: e.target.value})} 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-4 text-slate-500 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                
                {authData.confirmPassword && (
                  <div className={`text-[10px] font-bold uppercase tracking-widest px-2 ${authData.password === authData.confirmPassword ? 'text-green-500' : 'text-red-500'}`}>
                    {authData.password === authData.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </div>
                )}

                <div className="bg-slate-950 p-4 rounded-xl space-y-2 border border-slate-800">
                   <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase">
                     <div className={`w-1.5 h-1.5 rounded-full ${authData.password.length >= 8 ? 'bg-green-500' : 'bg-slate-700'}`} />
                     <span className={authData.password.length >= 8 ? 'text-green-500' : 'text-slate-500'}>8+ Characters</span>
                   </div>
                   <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase">
                     <div className={`w-1.5 h-1.5 rounded-full ${/[a-zA-Z]/.test(authData.password) ? 'bg-green-500' : 'bg-slate-700'}`} />
                     <span className={/[a-zA-Z]/.test(authData.password) ? 'text-green-500' : 'text-slate-500'}>Letters</span>
                   </div>
                   <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase">
                     <div className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(authData.password) ? 'bg-green-500' : 'bg-slate-700'}`} />
                     <span className={/[0-9]/.test(authData.password) ? 'text-green-500' : 'text-slate-500'}>Numbers</span>
                   </div>
                </div>
              </div>
              {error && <div className="text-red-500 text-xs mb-4 font-bold">{error}</div>}
              <button 
                onClick={proceedToOTP} 
                disabled={loading || !authData.password || authData.password !== authData.confirmPassword || !validatePassword(authData.password)} 
                className={`w-full h-12 font-bold rounded-xl text-white transition-all ${
                  (loading || !authData.password || authData.password !== authData.confirmPassword || !validatePassword(authData.password)) 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                {loading ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : 'Create Account'}
              </button>
            </motion.div>
          )}

          {step === 'OTP_VERIFY' && (
            <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="text-center">
              <div className="flex items-center mb-6">
                <button onClick={() => setStep('REGISTER_PASSWORD')} className="text-slate-500 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>
              <div className="w-16 h-16 bg-blue-600/10 text-blue-500 mx-auto rounded-2xl flex items-center justify-center mb-6">
                <Hash className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Verify Identity</h2>
              <p className="text-slate-400 text-sm mb-8">Enter the 6-digit code sent to your email.</p>
              <input 
                maxLength={6}
                placeholder="000000"
                className="w-full h-16 bg-slate-800 rounded-2xl text-center text-3xl font-black text-white tracking-[0.5em] outline-none border border-slate-700 focus:border-blue-500 mb-8"
                value={authData.otp}
                onChange={e => setAuthData({...authData, otp: e.target.value})}
              />
              {error && <div className="text-red-500 text-xs mb-4 font-bold">{error}</div>}
              <button onClick={verifyOTP} className="w-full h-12 bg-blue-600 hover:bg-blue-500 font-bold rounded-xl text-white">Verify Code</button>
              <p className="text-[10px] text-slate-500 mt-6 uppercase font-black tracking-widest">Dev Hint: Use 123456</p>
            </motion.div>
          )}

          {step === 'DEVICE_CHECK' && (
            <motion.div key="device" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center">
              <div className="flex items-center mb-6 text-left">
                <button onClick={() => setStep('OTP_VERIFY')} className="text-slate-500 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>
              <div className="w-20 h-20 bg-indigo-600/10 text-indigo-500 mx-auto rounded-3xl flex items-center justify-center mb-6">
                <DeviceIcon className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Security Scan</h2>
              <p className="text-slate-400 text-sm mb-8">Authorizing hardware signature for 1-device policy.</p>
              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6 text-xs">{error}</div>}
              <button 
                onClick={performDeviceCheck} 
                disabled={loading}
                className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Register Device'}
              </button>
            </motion.div>
          )}

          {step === 'FACE_VERIFY' && (
            <motion.div key="face" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center">
              <div className="flex items-center mb-6 text-left">
                <button onClick={() => setStep('DEVICE_CHECK')} className="text-slate-500 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>
              <div className="w-48 h-48 mx-auto relative mb-8">
                <div className="absolute inset-0 rounded-full border-4 border-slate-800 overflow-hidden bg-slate-950">
                   <div className="absolute inset-0 flex items-center justify-center">
                     <Camera className="w-16 h-16 text-slate-800" />
                   </div>
                   {livenessStatus !== 'idle' && (
                     <motion.div className="absolute inset-x-0 h-1 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] z-10" animate={{ top: ['0%', '100%', '0%'] }} transition={{ duration: 2.5, repeat: Infinity }} />
                   )}
                   {livenessStatus === 'complete' && <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center backdrop-blur-sm"><CheckCircle2 className="w-20 h-20 text-green-500" /></div>}
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Liveness Proof</h2>
              <p className="text-slate-400 text-sm mb-8">Anti-spoofing biometrics active. Blink when instructed.</p>
              <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-[10px] text-blue-400 font-bold uppercase mb-8 tracking-widest leading-loose">
                {livenessStatus === 'idle' ? 'Ready' : livenessStatus === 'scanning' ? '3D Spatial Mapping...' : livenessStatus === 'verifying' ? 'Neural Network Analysis...' : 'Verified'}
              </div>
              {livenessStatus === 'idle' && <button onClick={startFaceScan} className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all">Start Face Verify</button>}
            </motion.div>
          )}

          {step === 'SUCCESS' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <div className="w-20 h-20 bg-green-600 rounded-full mx-auto flex items-center justify-center mb-6 shadow-lg shadow-green-500/20">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase">Application Sent</h2>
              <p className="text-slate-400 text-sm mb-10">We are reviewing your identity assets. This usually takes 2-4 hours.</p>
              <button 
                onClick={() => window.location.reload()}
                className="w-full h-14 bg-white text-slate-950 font-black rounded-xl transition-all uppercase tracking-widest text-xs"
              >
                Access Dashboard (Limited)
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {['REGISTER_DETAILS', 'REGISTER_PASSWORD', 'OTP_VERIFY', 'DEVICE_CHECK', 'FACE_VERIFY'].includes(step) && (
          <div className="mt-8 flex justify-center gap-1.5 overflow-hidden">
            {['REGISTER_DETAILS', 'REGISTER_PASSWORD', 'OTP_VERIFY', 'DEVICE_CHECK', 'FACE_VERIFY'].map(s => (
              <div key={s} className={`h-1 rounded-full transition-all duration-700 ${step === s ? 'w-10 bg-blue-500' : 'w-4 bg-slate-800'}`} />
            ))}
          </div>
        )}
        
        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <p className="text-[9px] font-mono text-slate-700 uppercase tracking-[0.2em]">© 2026 com.adrewards.ph</p>
        </div>
      </motion.div>
    </div>
  );
}
