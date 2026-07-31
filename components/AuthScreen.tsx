/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  ScrollView, 
  Platform,
  Linking
} from 'react-native';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Mail, Phone, Lock, User, Play, ShieldAlert, Sparkles } from 'lucide-react-native';
import tw from 'twrnc';

interface AuthScreenProps {
  onAuthSuccess: (user?: any) => void;
}

type AuthMethod = 'email' | 'phone_demo';
type AuthMode = 'signin' | 'signup';

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [method, setMethod] = useState<AuthMethod>('email');
  const [mode, setMode] = useState<AuthMode>('signin');
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [demoPhone, setDemoPhone] = useState('');
  
  // UI Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync user profile to Firestore
  const syncUserProfile = async (user: any, nameToUse?: string) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const isFirstUser = user.email === 'pl531766@gmail.com' || user.uid === 'pl531766_admin_uid';
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email || `${user.uid}@storyrush.com`,
          displayName: nameToUse || user.displayName || 'Drama Fan',
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
          role: isFirstUser ? 'admin' : 'user', // Bootstrap pl531766@gmail.com as Admin
          isPremium: false,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err: any) {
      const isOfflineErr = err?.message?.includes('offline') || err?.code === 'unavailable';
      if (isOfflineErr) {
        console.log("Firestore is currently offline. Profile sync will complete automatically when reconnected.");
      } else {
        console.error("Error syncing profile to Firestore:", err);
      }
    }
  };

  const getFriendlyAuthErrorMessage = (err: any): string => {
    if (!err) {
      return 'An unexpected authentication error occurred. Please try again.';
    }

    const errMsg = String(err.message || '');
    if (!err.code) {
      return err.message || 'An unexpected authentication error occurred. Please try again.';
    }
    
    switch (err.code) {
      case 'auth/invalid-email':
        return '📧 Invalid Email Format: Please enter a valid email address.';
      case 'auth/user-not-found':
        return '👤 Account Not Found: No account is associated with this email. Please switch to "Sign Up" to create an account.';
      case 'auth/wrong-password':
        return '🔑 Incorrect password. Please check your spelling and try again.';
      case 'auth/email-already-in-use':
        return '📧 Email Already Registered: This email is already in use. Please switch to "Sign In" to access your account.';
      case 'auth/weak-password':
        return '🔒 Weak Password: The password must be at least 6 characters.';
      case 'auth/too-many-requests':
        return '⏳ Security Block: Too many requests. Please try again in a few minutes.';
      case 'auth/popup-blocked':
        return '🚫 Popup Blocked: Please allow popups in your browser settings to sign in with Google.';
      case 'auth/popup-closed-by-user':
        return '⚠️ Login Cancelled: The Google sign-in window was closed before completion.';
      case 'auth/cancelled-popup-request':
        return '⏳ Request Cancelled: Another sign-in attempt was started. Please try again.';
      default:
        return `${err.message} [Code: ${err.code}]`;
    }
  };

  // Email and Password Login / Signup
  const handleEmailAuth = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const trimmedEmail = email.trim();
      const trimmedPassword = password;

      if (!trimmedEmail || !trimmedPassword) {
        throw new Error('Please fill in all fields');
      }

      if (mode === 'signup') {
        const trimmedName = fullName.trim();
        if (!trimmedName) throw new Error('Please enter your name');
        if (trimmedPassword.length < 6) throw new Error('Password must be at least 6 characters');

        try {
          const result = await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
          await updateProfile(result.user, { displayName: trimmedName });
          await syncUserProfile(result.user, trimmedName);
        } catch (signupErr: any) {
          if (signupErr.code === 'auth/email-already-in-use') {
            console.log("Email already in use, performing automatic fallback sign in...");
            const result = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
            await syncUserProfile(result.user);
          } else {
            throw signupErr;
          }
        }
            } else {
        const result = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
        await syncUserProfile(result.user);
      }
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('storyrush_guest_user');
        }
      } catch (e) {}
      onAuthSuccess();
    } catch (err: any) {
      console.error("Email Auth Error:", err);
      setError(getFriendlyAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Google Authentication with Firebase Auth
  const handleGoogleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      const result = await signInWithPopup(auth, provider);
      await syncUserProfile(result.user);
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('storyrush_guest_user');
        }
      } catch (e) {}
      onAuthSuccess();
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      setError(getFriendlyAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Demo Phone / Quick login mechanism for standard Expo environment
  const handleDemoLogin = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const cleanPhone = demoPhone.replace(/[^0-9]/g, '') || '1234567890';
      if (cleanPhone.length < 4) {
        throw new Error('Please enter at least 4 digits/characters for Quick Access.');
      }
      
      const guestId = `guest_${cleanPhone}_${Math.random().toString(36).substring(2, 9)}`;
      const guestUser = {
        uid: guestId,
        displayName: `Quick User (${cleanPhone.slice(-4)})`,
        email: `guest_phone_${cleanPhone}@storyrush.demo`,
        photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${guestId}`,
        isGuest: true,
        isPremium: false,
        premium: false,
        createdAt: new Date().toISOString()
      };
      
      console.log("Generating local guest session:", guestUser);
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('storyrush_guest_user', JSON.stringify(guestUser));
        }
      } catch (e) {
        console.warn("localStorage setItem failed:", e);
      }
      
      onAuthSuccess(guestUser);
    } catch (err: any) {
      console.error("Demo Phone Auth Error:", err);
      setError(getFriendlyAuthErrorMessage(err) || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={tw`flex-1 bg-neutral-950`}
    >
      <ScrollView contentContainerStyle={tw`flex-grow justify-between px-6 py-8`}>
        {/* Decorative branding header */}
        <View style={tw`items-center mt-6 text-center`}>
          <View style={tw`w-16 h-16 rounded-3xl bg-red-600 items-center justify-center shadow-lg border border-red-500/30 mb-4`}>
            <Play size={32} color="#ffffff" style={tw`ml-1`} />
          </View>
          <Text style={tw`text-3xl font-extrabold text-white tracking-wider`}>
            STORY<Text style={tw`text-red-500`}>RUSH</Text>
          </Text>
          <Text style={tw`text-xs text-neutral-400 mt-1.5 text-center max-w-[280px] font-light leading-relaxed`}>
            Unlock 1-minute blockbusters. Thrillers, Romances, Actions at lightning speed.
          </Text>
        </View>

        {/* Main interactive cards section */}
        <View style={tw`flex-1 justify-center my-6`}>
          
          {/* Toggle Method tabs */}
          <View style={tw`flex-row bg-neutral-900 p-1 rounded-xl mb-6 border border-neutral-800/40`}>
            <TouchableOpacity
              onPress={() => { setMethod('email'); setError(null); }}
              style={tw`flex-1 py-2 rounded-lg flex-row items-center justify-center ${
                method === 'email' ? 'bg-red-600 shadow' : ''
              }`}
            >
              <Mail size={12} color="#ffffff" style={tw`mr-1`} />
              <Text style={tw`text-[10px] sm:text-xs font-semibold text-white`}>Email/Pass</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => { setMethod('phone_demo'); setError(null); }}
              style={tw`flex-1 py-2 rounded-lg flex-row items-center justify-center ${
                method === 'phone_demo' ? 'bg-red-600 shadow' : ''
              }`}
            >
              <Sparkles size={12} color="#ffffff" style={tw`mr-1`} />
              <Text style={tw`text-[10px] sm:text-xs font-semibold text-white`}>Quick Access</Text>
            </TouchableOpacity>
          </View>

          {/* Error Callout */}
          {error && (
            <View style={tw`bg-red-950/40 border border-red-500/30 p-3 rounded-xl flex-row items-start mb-4`}>
              <ShieldAlert size={16} color="#ef4444" style={tw`mr-2 mt-0.5 shrink-0`} />
              <Text style={tw`text-red-400 text-xs flex-1`}>{error}</Text>
            </View>
          )}

          {/* Email Form */}
          {method === 'email' && (
            <View style={tw`gap-4`}>
              {mode === 'signup' && (
                <View style={tw`relative`}>
                  <User size={16} color="#737373" style={tw`absolute left-4 top-3.5 z-10`} />
                  <TextInput
                    placeholder="Full Name"
                    placeholderTextColor="#737373"
                    value={fullName}
                    onChangeText={setFullName}
                    style={tw`w-full bg-neutral-900 border border-neutral-800 focus:border-red-600 text-sm text-white pl-11 pr-4 py-3.5 rounded-xl`}
                  />
                </View>
              )}

              <View style={tw`relative`}>
                <Mail size={16} color="#737373" style={tw`absolute left-4 top-3.5 z-10`} />
                <TextInput
                  placeholder="Email Address"
                  placeholderTextColor="#737373"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  style={tw`w-full bg-neutral-900 border border-neutral-800 focus:border-red-600 text-sm text-white pl-11 pr-4 py-3.5 rounded-xl`}
                />
              </View>

              <View style={tw`relative`}>
                <Lock size={16} color="#737373" style={tw`absolute left-4 top-3.5 z-10`} />
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#737373"
                  secureTextEntry
                  autoCapitalize="none"
                  value={password}
                  onChangeText={setPassword}
                  style={tw`w-full bg-neutral-900 border border-neutral-800 focus:border-red-600 text-sm text-white pl-11 pr-4 py-3.5 rounded-xl`}
                />
              </View>

              <TouchableOpacity
                onPress={handleEmailAuth}
                disabled={loading}
                style={tw`w-full bg-red-600 py-3.5 rounded-xl items-center justify-center flex-row shadow-lg mt-2`}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={tw`text-sm font-bold text-white tracking-wide`}>
                    {mode === 'signin' ? 'Sign In' : 'Create Account'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Styled Divider */}
              <View style={tw`flex-row items-center my-2`}>
                <View style={tw`flex-1 h-[1px] bg-neutral-800/60`} />
                <Text style={tw`text-[10px] text-neutral-500 font-bold uppercase tracking-wider mx-3`}>or</Text>
                <View style={tw`flex-1 h-[1px] bg-neutral-800/60`} />
              </View>

              {/* Premium Google Sign-In Button */}
              <TouchableOpacity
                onPress={handleGoogleSignIn}
                disabled={loading}
                style={tw`w-full bg-white py-3.5 rounded-xl items-center justify-center flex-row shadow-lg`}
              >
                {loading ? (
                  <ActivityIndicator color="#171717" size="small" />
                ) : (
                  <>
                    <Text style={tw`font-extrabold text-sm mr-2 flex-row`}>
                      <Text style={tw`text-blue-500`}>G</Text>
                      <Text style={tw`text-red-500`}>o</Text>
                      <Text style={tw`text-amber-500`}>o</Text>
                      <Text style={tw`text-blue-500`}>g</Text>
                      <Text style={tw`text-green-500`}>l</Text>
                      <Text style={tw`text-red-500`}>e</Text>
                    </Text>
                    <Text style={tw`text-sm font-bold text-neutral-900 tracking-wide`}>
                      Continue with Google
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                style={tw`align-self-center mt-3`}
              >
                <Text style={tw`text-xs text-neutral-400 text-center hover:text-white`}>
                  {mode === 'signin' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Demo Phone Form / Quick Access */}
          {method === 'phone_demo' && (
            <View style={tw`gap-4`}>
              <View style={tw`bg-neutral-900/50 p-4 rounded-xl border border-neutral-800 mb-2`}>
                <Sparkles size={16} color="#ef4444" style={tw`align-self-center mb-1`} />
                <Text style={tw`text-xs text-neutral-400 text-center leading-relaxed`}>
                  Fast track your login! Enter any mock/real identifier to quickly launch without SMS waiting. Perfect for EAS native tests and fast reviews.
                </Text>
              </View>

              <View style={tw`relative`}>
                <Phone size={16} color="#737373" style={tw`absolute left-4 top-3.5 z-10`} />
                <TextInput
                  placeholder="Reference Identifier (e.g. 9876543210)"
                  placeholderTextColor="#737373"
                  keyboardType="phone-pad"
                  value={demoPhone}
                  onChangeText={setDemoPhone}
                  style={tw`w-full bg-neutral-900 border border-neutral-800 focus:border-red-600 text-sm text-white pl-11 pr-4 py-3.5 rounded-xl`}
                />
              </View>

              <TouchableOpacity
                onPress={handleDemoLogin}
                disabled={loading}
                style={tw`w-full bg-red-600 py-3.5 rounded-xl items-center justify-center shadow-lg mt-2`}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={tw`text-sm font-bold text-white tracking-wide`}>
                    Verify & Instant Login
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

        </View>

        {/* Footer credits and policy */}
        <View style={tw`mt-auto`}>
          <Text style={tw`text-center text-[10px] text-neutral-500 font-light px-4 leading-relaxed`}>
            By continuing, you agree to Story Rush's{' '}
            <Text style={tw`text-neutral-400 underline`} onPress={() => Linking.openURL('https://storyrush.com/terms')}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={tw`text-neutral-400 underline`} onPress={() => Linking.openURL('https://storyrush.com/privacy')}>Privacy Policy</Text>.
            Built securely with Firebase Enterprise.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
