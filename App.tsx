/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  ScrollView, 
  Platform,
  Alert,
  useWindowDimensions
} from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, setDoc, onSnapshot, getDoc, query, where, orderBy, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Category, Drama, DramaCategory, Series, mapDocToDrama } from './types';

// Components
import AndroidFrame from './components/AndroidFrame';
import AuthScreen from './components/AuthScreen';
import HomeScreen from './components/HomeScreen';
import CategoriesScreen from './components/CategoriesScreen';
import SearchScreen from './components/SearchScreen';
import SubscriptionScreen from './components/SubscriptionScreen';
import ProfileScreen from './components/ProfileScreen';
import AdminPanel from './components/AdminPanel';
import SeriesDetailScreen from './components/SeriesDetailScreen';

import { 
  Home, 
  Compass, 
  Search, 
  Zap, 
  User, 
  Sparkles,
  Play
} from 'lucide-react-native';
import tw from 'twrnc';

type Tab = 'home' | 'categories' | 'search' | 'subscription' | 'profile';

export default function App() {
  const { width } = useWindowDimensions();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [showAdminConsole, setShowAdminConsole] = useState(false);
  const [selectedDramaId, setSelectedDramaId] = useState<string | null>(null);
  const [companionCategory, setCompanionCategory] = useState<Category | null>(null);
  const [companionDramas, setCompanionDramas] = useState<Drama[]>([]);
  const [activeSeries, setActiveSeries] = useState<{ id: string; name: string } | null>(null);

  // Track authentication state
  useEffect(() => {
    let guestUser: any = null;
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('storyrush_guest_user');
        if (stored) {
          guestUser = JSON.parse(stored);
        }
      }
    } catch (e) {
      console.warn("localStorage check failed:", e);
    }

    if (guestUser) {
      console.log("App: Restoring local guest user session:", guestUser.uid);
      setCurrentUser(guestUser);
      setAuthLoading(false);
      bootstrapUserProfile();
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      let currentIsGuest = false;
      try {
        if (typeof localStorage !== 'undefined') {
          currentIsGuest = !!localStorage.getItem('storyrush_guest_user');
        }
      } catch (e) {}

      if (!currentIsGuest) {
        setCurrentUser(user);
        setAuthLoading(false);
        if (user) {
          bootstrapUserProfile();
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Self-healing migration to populate seriesId on legacy documents if missing
  useEffect(() => {
    const migrate = async () => {
      try {
        const dramasSnap = await getDocs(collection(db, 'dramas'));
        dramasSnap.forEach(async (docSnap) => {
          const data = docSnap.data();
          if (!data.seriesId && data.seriesName) {
            const generatedId = data.seriesName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
            await updateDoc(doc(db, 'dramas', docSnap.id), { seriesId: generatedId });
            await updateDoc(doc(db, 'episodes', docSnap.id), { seriesId: generatedId });
            console.log(`Self-healed database: mapped seriesId '${generatedId}' to drama ${docSnap.id}`);
          }
        });
      } catch (err) {
        console.warn("Self-healing migration failed silently:", err);
      }
    };
    migrate();
  }, []);

  // Fetch dramas for companion displays
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'episodes'), (snapshot) => {
      const list: Drama[] = snapshot.docs.map(docSnap => mapDocToDrama(docSnap.id, docSnap.data()));
      list.sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0));
      setCompanionDramas(list);
    }, (error) => {
      console.warn("Companion dramas subscription error:", error);
    });

    return () => unsub();
  }, []);

  // Bootstrap user profile document on first login
  const bootstrapUserProfile = async () => {
    try {
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          console.log("App: User profile missing. Bootstrapping user profile...");
          const isFirstUser = auth.currentUser.email === 'pl531766@gmail.com' || auth.currentUser.uid === 'pl531766_admin_uid';
          await setDoc(userRef, {
            uid: auth.currentUser.uid,
            email: auth.currentUser.email || `${auth.currentUser.uid}@storyrush.com`,
            displayName: auth.currentUser.displayName || 'Drama Fan',
            photoURL: auth.currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${auth.currentUser.uid}`,
            role: isFirstUser ? 'admin' : 'user',
            isPremium: false,
            createdAt: new Date().toISOString()
          });
        }
      }
    } catch (profileErr) {
      console.warn("App: Non-blocking profile check/bootstrap issue:", profileErr);
    }
  };

  const handleLaunchDrama = (dramaId: string) => {
    setSelectedDramaId(dramaId);
    setActiveTab('home');
  };

  const handleLogout = () => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('storyrush_guest_user');
      }
    } catch (e) {}
    setCurrentUser(null);
    setActiveTab('home');
  };

  const isWeb = Platform.OS === 'web';

  const renderMobileContent = () => {
    if (authLoading) {
      return (
        <View style={tw`flex-1 bg-black items-center justify-center`}>
          <ActivityIndicator size="large" color="#dc2626" />
          <Text style={tw`text-xs text-neutral-400 font-bold uppercase tracking-widest mt-4`}>Story Rush</Text>
        </View>
      );
    }

    if (!currentUser) {
      return (
        <AuthScreen 
          onAuthSuccess={(user?: any) => {
            if (user) {
              setCurrentUser(user);
            }
            setActiveTab('home');
          }} 
        />
      );
    }

    const isDesktopFrame = Platform.OS === 'web' && width > 480;
    const containerHeightStyle = isDesktopFrame 
      ? { height: '100%', minHeight: '100%', maxHeight: '100%', overflow: 'hidden' }
      : { height: '100dvh', minHeight: '100dvh', maxHeight: '100dvh', overflow: 'hidden' };

    return (
      <View style={[tw`flex-1 bg-black text-white relative`, containerHeightStyle as any]}>
        {/* NavigationContainer (flex:1) */}
        <View style={tw`flex-1 relative flex-col min-h-0`}>
          {showAdminConsole ? (
            <AdminPanel onClose={() => setShowAdminConsole(false)} />
          ) : (
            <>
              {activeTab === 'home' && (
                <HomeScreen 
                  onPremiumNav={() => setActiveTab('subscription')} 
                  activeCategory={selectedDramaId} 
                  currentUser={currentUser}
                  onOpenSeries={(sId, sName) => setActiveSeries({ id: sId, name: sName })}
                  onClearActiveCategory={() => setSelectedDramaId(null)}
                />
              )}
              {activeTab === 'categories' && (
                <CategoriesScreen 
                  currentUser={currentUser}
                  onSelectDrama={handleLaunchDrama} 
                  onOpenSeries={(sId, sName) => setActiveSeries({ id: sId, name: sName })}
                  initialCategory={companionCategory}
                />
              )}
              {activeTab === 'search' && (
                <SearchScreen 
                  currentUser={currentUser}
                  onSelectDrama={handleLaunchDrama} 
                  onOpenSeries={(sId, sName) => setActiveSeries({ id: sId, name: sName })}
                />
              )}
              {activeTab === 'subscription' && (
                <SubscriptionScreen 
                  currentUser={currentUser}
                  onSuccess={() => setActiveTab('profile')} 
                />
              )}
              {activeTab === 'profile' && (
                <ProfileScreen 
                  currentUser={currentUser}
                  onLogout={handleLogout} 
                  onSelectDrama={handleLaunchDrama}
                  onOpenAdminPanel={() => setShowAdminConsole(true)}
                  onPremiumNav={() => setActiveTab('subscription')}
                />
              )}

              {/* Series Detail Page Overlay */}
              {activeSeries && (
                <SeriesDetailScreen 
                  seriesId={activeSeries.id}
                  seriesName={activeSeries.name}
                  currentUser={currentUser}
                  onClose={() => setActiveSeries(null)}
                  onSelectDrama={(dramaId) => {
                    setActiveSeries(null);
                    handleLaunchDrama(dramaId);
                  }}
                  onPremiumNav={() => {
                    setActiveSeries(null);
                    setActiveTab('subscription');
                  }}
                />
              )}
            </>
          )}
        </View>

        {/* BottomTabNavigator */}
        {!showAdminConsole && (
          <View style={[
            tw`border-neutral-900/60 flex-row items-center justify-around px-2`,
            {
              position: isDesktopFrame ? 'absolute' : (Platform.OS === 'web' ? 'fixed' : 'absolute'),
              bottom: 0,
              left: 0,
              right: 0,
              width: '100%',
              maxWidth: '100%',
              backgroundColor: 'rgba(10, 10, 10, 0.95)',
              backdropFilter: 'blur(12px)',
              borderTopWidth: 1,
              borderTopColor: 'rgba(255, 255, 255, 0.08)',
              height: 64,
              zIndex: 9999,
            } as any
          ]}>
            {[
              { key: 'home', label: 'Home', icon: Home },
              { key: 'categories', label: 'Genres', icon: Compass },
              { key: 'search', label: 'Search', icon: Search },
              { key: 'subscription', label: 'Premium', icon: Zap, highlight: true },
              { key: 'profile', label: 'Profile', icon: User }
            ].map((tab) => {
              const TabIcon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  activeOpacity={0.7}
                  onPress={() => {
                    setActiveTab(tab.key as Tab);
                    if (tab.key !== 'home') {
                      setSelectedDramaId(null);
                    }
                  }}
                  style={tw`flex-col items-center justify-center py-2 px-1 relative flex-1`}
                >
                  <TabIcon size={18} color={
                    active 
                      ? (tab.highlight ? '#f59e0b' : '#ef4444') 
                      : '#737373'
                  } style={tw`mb-1`} />
                  <Text style={tw`text-[9px] font-bold ${active ? 'text-white' : 'text-neutral-500'}`}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  // Dual-Pane visual setup if loaded in web iframe, fullscreen on native phone screens
  if (isWeb && width > 480) {
    return (
      <View style={tw`flex-1 w-full bg-neutral-950 flex-row items-center justify-center p-3 md:p-6 gap-8`}>
        {/* Mobile Simulated Screen Frame */}
        <View style={[{ width: 375, height: 800 }, tw`shrink-0 shadow-2xl rounded-[40px] overflow-hidden bg-black`]}>
          <AndroidFrame>
            {renderMobileContent()}
          </AndroidFrame>
        </View>

        {/* Premium Companion Desktop Dashboard (rendered in web for high fidelity) */}
        {currentUser && !showAdminConsole && (
          <View style={tw`hidden lg:flex w-[480px] h-[800px] flex-col justify-between p-8 bg-neutral-900 rounded-[32px] border border-neutral-800 shadow-2xl`}>
            <View>
              <Text style={tw`text-2xl font-black text-white tracking-tighter`}>
                STORY<Text style={tw`text-red-600`}>RUSH</Text> COMPANION
              </Text>
              <Text style={tw`text-neutral-500 text-[10px] uppercase font-bold tracking-widest mt-1`}>
                Short dramas. Massive stories.
              </Text>
            </View>

            <ScrollView contentContainerStyle={tw`gap-6 py-4`}>
              {/* Premium Promotion */}
              <View style={tw`bg-gradient-to-r from-red-950/40 to-neutral-950 border border-red-900/45 p-5 rounded-2xl`}>
                <View style={tw`bg-amber-500/10 border border-amber-500/35 px-2 py-0.5 rounded self-start mb-2`}>
                  <Text style={tw`text-amber-500 text-[8px] font-black uppercase tracking-wider`}>VIP PROMO</Text>
                </View>
                <Text style={tw`text-xs font-black text-white uppercase`}>Unlock Instant Premium VIP</Text>
                <Text style={tw`text-[10px] text-neutral-400 mt-1 leading-relaxed`}>
                  Enjoy direct unrestricted access, no timers, completely ad-free vertical movie theater layouts, and HD quality streams!
                </Text>
                <TouchableOpacity 
                  onPress={() => setActiveTab('subscription')}
                  style={tw`bg-red-600 py-2 rounded-xl mt-4 items-center`}
                >
                  <Text style={tw`text-white font-black text-[9px] uppercase tracking-wider`}>Upgrade Now &rarr;</Text>
                </TouchableOpacity>
              </View>

              {/* Showcase list */}
              <View style={tw`gap-3`}>
                <Text style={tw`text-[10px] font-bold text-neutral-500 uppercase tracking-wider`}>LIVE FRANCHISES</Text>
                {companionDramas.slice(0, 3).map((drama) => (
                  <TouchableOpacity
                    key={drama.id}
                    onPress={() => handleLaunchDrama(drama.id)}
                    style={tw`flex-row gap-3 bg-neutral-950 p-3 rounded-xl border border-neutral-800`}
                  >
                    <View style={tw`w-10 h-14 bg-black rounded-lg overflow-hidden shrink-0`}>
                      <AndroidFrame>
                        <View style={tw`w-full h-full bg-red-600`} />
                      </AndroidFrame>
                    </View>
                    <View style={tw`flex-1 justify-center`}>
                      <Text style={tw`text-xs font-bold text-white`} numberOfLines={1}>{drama.seriesName}</Text>
                      <Text style={tw`text-[9px] text-neutral-400 mt-0.5`} numberOfLines={1}>{drama.title} • Ep. {drama.episodeNumber}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={tw`flex-row justify-between items-center pt-4 border-t border-neutral-850`}>
              <Text style={tw`text-[9px] text-neutral-500 font-bold uppercase`}>© 2026 Story Rush</Text>
              <View style={tw`flex-row items-center gap-1.5`}>
                <View style={tw`w-1.5 h-1.5 bg-green-500 rounded-full`} />
                <Text style={tw`text-[8px] font-mono text-neutral-500`}>SYNC STATUS: ACTIVE</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  }

  // Full Screen layout for native Android / iOS devices
  return (
    <View style={[tw`flex-1 bg-black`, Platform.OS === 'web' ? { height: '100dvh', minHeight: '100dvh', maxHeight: '100dvh', overflow: 'hidden' } as any : {}]}>
      {renderMobileContent()}
    </View>
  );
}
