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
  Image, 
  Alert 
} from 'react-native';
import { 
  collection, 
  doc, 
  getDoc, 
  query, 
  where, 
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { Drama, WatchHistory, mapDocToDrama } from '../types';
import { 
  LogOut, 
  Play, 
  History, 
  Bookmark, 
  ShieldAlert, 
  Crown,
  ListRestart,
  ChevronRight,
  Mail,
  FileText,
  Coins,
  Download,
  CreditCard,
  Settings as SettingsIcon,
  HelpCircle,
  ShieldCheck,
  Info
} from 'lucide-react-native';
import tw from 'twrnc';
import LegalPages, { LegalPageType } from './LegalPages';
import DownloadsScreen from './DownloadsScreen';
import HistoryScreen from './HistoryScreen';
import SettingsScreen from './SettingsScreen';
import AboutScreen from './AboutScreen';

interface ProfileScreenProps {
  currentUser: any;
  onLogout: () => void;
  onSelectDrama: (dramaId: string) => void;
  onOpenAdminPanel: () => void;
  onPremiumNav: () => void;
}

export default function ProfileScreen({ 
  currentUser,
  onLogout, 
  onSelectDrama, 
  onOpenAdminPanel,
  onPremiumNav 
}: ProfileScreenProps) {
  const [profile, setProfile] = useState<any>(null);
  const [historyList, setHistoryList] = useState<(WatchHistory & { drama?: Drama })[]>([]);
  const [favoritesList, setFavoritesList] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLegalPage, setActiveLegalPage] = useState<LegalPageType | null>(null);
  const [activeSubScreen, setActiveSubScreen] = useState<'downloads' | 'history' | 'settings' | 'about' | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    if (currentUser.isGuest) {
      setLoading(true);
      const loadProfile = () => {
        let guestUser = currentUser;
        try {
          const stored = localStorage.getItem('storyrush_guest_user');
          if (stored) {
            guestUser = JSON.parse(stored);
          }
        } catch (e) {}

        setProfile({
          uid: guestUser.uid,
          displayName: guestUser.displayName,
          email: guestUser.email,
          photoURL: guestUser.photoURL,
          role: 'user',
          isPremium: guestUser.isPremium || guestUser.premium || false
        });
      };

      loadProfile();
      const interval = setInterval(loadProfile, 1000);

      // Listen to episodes from Firestore to dynamically resolve history and favorites for guest
      const unsub = onSnapshot(collection(db, 'episodes'), (snapshot) => {
        const liveDramas: Drama[] = snapshot.docs.map(docSnap => mapDocToDrama(docSnap.id, docSnap.data()));
        liveDramas.sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0));

        try {
          const localHistory = JSON.parse(localStorage.getItem(`history_${currentUser.uid}`) || '[]');
          const historyWithDrama = localHistory.map((h: any) => {
            const matching = liveDramas.find(d => d.id === h.dramaId);
            return {
              ...h,
              drama: matching
            };
          }).filter((h: any) => !!h.drama);
          
          setHistoryList(historyWithDrama);

          const localFavs = JSON.parse(localStorage.getItem(`favs_${currentUser.uid}`) || '{}');
          const favoritesWithDrama = liveDramas.filter(d => !!localFavs[d.id]);
          setFavoritesList(favoritesWithDrama);
        } catch (err) {
          console.warn("Failed to load guest data for ProfileScreen", err);
        }
        setLoading(false);
      }, (error) => {
        console.error("ProfileScreen guest subscription error:", error);
        setLoading(false);
      });

      return () => {
        clearInterval(interval);
        unsub();
      };
    }

    setLoading(true);

    // 1. Listen to active User Profile Document
    const unsubscribeProfile = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data());
      }
    });

    // 2. Listen to Watch History
    const historyQuery = query(
      collection(db, 'history'),
      where('userId', '==', currentUser.uid)
    );
    const unsubscribeHistory = onSnapshot(historyQuery, async (snapshot) => {
      try {
        const historyItems: (WatchHistory & { drama?: Drama })[] = [];
        
        for (const docSnap of snapshot.docs) {
          const hData = docSnap.data() as WatchHistory;
          
          // Fetch matching drama details
          const dramaSnap = await getDoc(doc(db, 'episodes', hData.dramaId));
          if (dramaSnap.exists()) {
            historyItems.push({
              ...hData,
              drama: { id: dramaSnap.id, ...dramaSnap.data() } as Drama
            });
          }
        }
        
        setHistoryList(historyItems);
      } catch (err) {
        // Silently capture any loading race condition
      }
    });

    // 3. Listen to Favorites
    const favQuery = query(
      collection(db, 'favorites'),
      where('userId', '==', currentUser.uid)
    );
    const unsubscribeFavorites = onSnapshot(favQuery, async (snapshot) => {
      try {
        const dramasTemp: Drama[] = [];
        
        for (const docSnap of snapshot.docs) {
          const fData = docSnap.data();
          const dramaSnap = await getDoc(doc(db, 'episodes', fData.dramaId));
          if (dramaSnap.exists()) {
            dramasTemp.push({ id: dramaSnap.id, ...dramaSnap.data() } as Drama);
          }
        }
        setFavoritesList(dramasTemp);
        setLoading(false);
      } catch (err) {
        // Silently capture
      }
    }, (err) => {
      console.warn("Firestore collection listen warning (offline/unavailable):", err);
    });

    return () => {
      unsubscribeProfile();
      unsubscribeHistory();
      unsubscribeFavorites();
    };
  }, [currentUser]);

  const handleSignOut = async () => {
    try {
      if (currentUser?.isGuest) {
        onLogout();
        return;
      }
      await auth.signOut();
      onLogout();
    } catch (err) {
      Alert.alert('Sign Out Error', 'Failed to log out correctly.');
    }
  };

  const isAdmin = profile?.role === 'admin' || currentUser?.email === 'pl531766@gmail.com';

  return (
    <View style={tw`flex-1 bg-neutral-950`}>
      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`px-4 pt-6 pb-24`} showsVerticalScrollIndicator={false}>
      {/* Profile Card Summary */}
      <View style={tw`bg-neutral-900 p-5 rounded-[24px] border border-neutral-800/60 mb-6 flex-row items-center justify-between shadow-xl relative overflow-hidden`}>
        
        <View style={tw`flex-row items-center gap-4 flex-1`}>
          {/* Avatar frame */}
          <View style={tw`relative`}>
            <View style={tw`w-14 h-14 rounded-full p-0.5 items-center justify-center ${
              profile?.isPremium ? 'bg-amber-500' : 'bg-neutral-800'
            }`}>
              <Image 
                source={{ uri: profile?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser?.uid}` }} 
                style={tw`w-full h-full rounded-full bg-black`} 
                resizeMode="cover"
              />
            </View>
            
            {(profile?.isPremium || profile?.premium) && (
              <View style={tw`absolute -top-1.5 -right-1 bg-amber-500 p-0.5 rounded-full border border-black items-center justify-center`}>
                <Crown size={10} color="#000000" fill="#000000" />
              </View>
            )}
          </View>

          <View style={tw`flex-1 ml-3`}>
            <View style={tw`flex-row items-center`}>
              <Text style={tw`text-sm font-extrabold text-neutral-100 mr-2`} numberOfLines={1}>
                {profile?.displayName || 'Story Rush Binger'}
              </Text>
              {(profile?.isPremium || profile?.premium) && (
                <View style={tw`bg-amber-500/10 border border-amber-500/35 px-2 py-0.5 rounded`}>
                  <Text style={tw`text-amber-500 text-[8px] uppercase tracking-wider font-black`}>VIP</Text>
                </View>
              )}
            </View>
            <Text style={tw`text-[10px] text-neutral-500 mt-1`} numberOfLines={1}>
              {profile?.email || currentUser?.email}
            </Text>
            {(profile?.isPremium || profile?.premium) && (
              <View style={tw`flex-row items-center gap-1 mt-1.5`}>
                <Crown size={12} color="#f59e0b" fill="#f59e0b" />
                <Text style={tw`text-[11px] text-amber-500 font-extrabold tracking-wider uppercase`}>
                  Premium User
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Logout action */}
        <TouchableOpacity 
          onPress={handleSignOut}
          style={tw`w-9 h-9 rounded-full bg-neutral-950 border border-neutral-800 flex items-center justify-center`}
        >
          <LogOut size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Admin Panel Entry Callout */}
      {isAdmin && (
        <TouchableOpacity
          onPress={onOpenAdminPanel}
          style={tw`w-full bg-neutral-900 border border-red-900/40 p-4 rounded-2xl flex-row items-center justify-between mb-6`}
        >
          <View style={tw`flex-row items-center flex-1 mr-3`}>
            <View style={tw`w-8 h-8 rounded-xl bg-red-600/10 items-center justify-center`}>
              <ShieldAlert size={18} color="#ef4444" />
            </View>
            <View style={tw`flex-1 ml-3`}>
              <Text style={tw`text-xs font-black text-white uppercase tracking-wider`}>Admin Console Workspace</Text>
              <Text style={tw`text-[9px] text-neutral-400 mt-0.5 font-light`}>Add dramas, update episodes, and manage user statuses.</Text>
            </View>
          </View>
          <Text style={tw`text-[10px] text-red-500 font-extrabold uppercase`}>
            Enter &rarr;
          </Text>
        </TouchableOpacity>
      )}

      {/* Non-Premium upgrade promotion banner */}
      {!(profile?.isPremium || profile?.premium) && (
        <TouchableOpacity 
          onPress={onPremiumNav}
          style={tw`bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl mb-6 flex-row items-center justify-between`}
        >
          <View style={tw`flex-row items-center flex-1 mr-3`}>
            <Crown size={20} color="#f59e0b" style={tw`mr-3`} />
            <View style={tw`flex-1`}>
              <Text style={tw`text-xs font-black text-amber-400 uppercase`}>Upgrade to Premium VIP</Text>
              <Text style={tw`text-[9px] text-neutral-400 mt-0.5`}>Banish ads, unlock secret series, and access 1080p stream.</Text>
            </View>
          </View>
          <View style={tw`bg-amber-500 px-3 py-1.5 rounded-xl`}>
            <Text style={tw`text-black text-[9px] font-black uppercase`}>Join</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Continue Watching Section */}
      <View style={tw`mb-6`}>
        <View style={tw`flex-row items-center gap-2 mb-3`}>
          <History size={16} color="#dc2626" style={tw`mr-1.5`} />
          <Text style={tw`text-xs font-black text-white uppercase tracking-wider`}>Continue Watching</Text>
        </View>

        {historyList.length === 0 ? (
          <View style={tw`bg-neutral-900/35 border border-neutral-800 p-6 rounded-2xl items-center`}>
            <ListRestart size={24} color="#404040" style={tw`mb-2`} />
            <Text style={tw`text-[10px] font-light text-neutral-500`}>No continue watching yet</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`flex-row gap-3 pb-2`}>
            {historyList.map((item) => {
              if (!item.drama) return null;
              const percent = Math.min(100, Math.floor((item.progress / (item.duration || 60)) * 100));

              return (
                <TouchableOpacity 
                  key={item.id}
                  onPress={() => onSelectDrama(item.dramaId)}
                  style={tw`w-[120px] bg-neutral-900 rounded-xl border border-neutral-800/60 overflow-hidden`}
                >
                  <View style={[tw`relative bg-neutral-950`, { aspectRatio: 3 / 4 }]}>
                    <Image source={{ uri: item.drama.thumbnailUrl }} style={tw`w-full h-full`} resizeMode="cover" />
                    
                    {/* Play Overlay */}
                    <View style={tw`absolute inset-0 bg-black/40 items-center justify-center`}>
                      <Play size={16} color="#ffffff" fill="#ffffff" />
                    </View>

                    {/* Progress Bar Container */}
                    <View style={tw`absolute bottom-0 left-0 right-0 h-1 bg-neutral-800`}>
                      <View style={[tw`h-full bg-red-600`, { width: `${percent}%` }]} />
                    </View>
                  </View>
                  <View style={tw`p-2`}>
                    <Text style={tw`text-[10px] font-bold text-neutral-200`} numberOfLines={1}>{item.drama.seriesName}</Text>
                    <Text style={tw`text-[9px] text-neutral-500 mt-0.5 font-semibold`}>Ep. {item.drama.episodeNumber} ({percent}%)</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Favorites Grid Section */}
      <View style={tw`pb-12`}>
        <View style={tw`flex-row items-center gap-2 mb-3`}>
          <Bookmark size={16} color="#f59e0b" style={tw`mr-1.5`} />
          <Text style={tw`text-xs font-black text-white uppercase tracking-wider`}>My Favorites</Text>
        </View>

        {favoritesList.length === 0 ? (
          <View style={tw`bg-neutral-900/35 border border-neutral-800 p-8 rounded-2xl items-center`}>
            <Bookmark size={24} color="#404040" style={tw`mb-2`} />
            <Text style={tw`text-[10px] font-light text-neutral-500`}>Your saved favorites list is empty.</Text>
          </View>
        ) : (
          <View style={tw`flex-row flex-wrap justify-between`}>
            {favoritesList.map((drama) => (
              <TouchableOpacity 
                key={drama.id}
                onPress={() => onSelectDrama(drama.id)}
                style={[tw`bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden mb-4`, { width: '48%' }]}
              >
                <View style={[tw`relative bg-neutral-950`, { aspectRatio: 4 / 5 }]}>
                  <Image source={{ uri: drama.thumbnailUrl }} style={tw`w-full h-full`} resizeMode="cover" />
                  <View style={tw`absolute top-2 left-2 bg-black/75 px-1.5 py-0.5 rounded`}>
                    <Text style={tw`text-[8px] text-red-500 font-bold`}>Ep. {drama.episodeNumber}</Text>
                  </View>
                </View>
                <View style={tw`p-2.5`}>
                  <Text style={tw`text-xs font-extrabold text-neutral-200`} numberOfLines={1}>{drama.seriesName}</Text>
                  <Text style={tw`text-[9px] text-neutral-500 mt-0.5`} numberOfLines={1}>{drama.title}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Quick Menu Options (Downloads, History, Purchased, Settings, Help, Legal, About) */}
      <View style={tw`mb-8`}>
        <View style={tw`flex-row items-center gap-2 mb-3.5`}>
          <SettingsIcon size={16} color="#ef4444" style={tw`mr-1.5`} />
          <Text style={tw`text-xs font-black text-white uppercase tracking-wider`}>Account & Preferences</Text>
        </View>

        <View style={tw`bg-neutral-900 rounded-[20px] border border-neutral-800/60 overflow-hidden`}>
          {/* Downloads */}
          <TouchableOpacity 
            onPress={() => setActiveSubScreen('downloads')}
            style={tw`flex-row items-center justify-between p-4 border-b border-neutral-800/40`}
          >
            <View style={tw`flex-row items-center gap-3`}>
              <View style={tw`w-8 h-8 rounded-xl bg-neutral-950 border border-neutral-800 items-center justify-center`}>
                <Download size={14} color="#a3a3a3" />
              </View>
              <Text style={tw`text-xs font-bold text-neutral-200`}>Downloads</Text>
            </View>
            <View style={tw`flex-row items-center gap-2`}>
              <Text style={tw`text-[10px] text-neutral-500 font-medium`}>2 Files</Text>
              <ChevronRight size={14} color="#525252" />
            </View>
          </TouchableOpacity>

          {/* History */}
          <TouchableOpacity 
            onPress={() => setActiveSubScreen('history')}
            style={tw`flex-row items-center justify-between p-4 border-b border-neutral-800/40`}
          >
            <View style={tw`flex-row items-center gap-3`}>
              <View style={tw`w-8 h-8 rounded-xl bg-neutral-950 border border-neutral-800 items-center justify-center`}>
                <History size={14} color="#a3a3a3" />
              </View>
              <Text style={tw`text-xs font-bold text-neutral-200`}>History</Text>
            </View>
            <View style={tw`flex-row items-center gap-2`}>
              <Text style={tw`text-[10px] text-neutral-500 font-medium`}>{historyList.length} items</Text>
              <ChevronRight size={14} color="#525252" />
            </View>
          </TouchableOpacity>

          {/* Purchased */}
          <TouchableOpacity 
            onPress={onPremiumNav}
            style={tw`flex-row items-center justify-between p-4 border-b border-neutral-800/40`}
          >
            <View style={tw`flex-row items-center gap-3`}>
              <View style={tw`w-8 h-8 rounded-xl bg-neutral-950 border border-neutral-800 items-center justify-center`}>
                <CreditCard size={14} color="#a3a3a3" />
              </View>
              <Text style={tw`text-xs font-bold text-neutral-200`}>Purchased / VIP Passes</Text>
            </View>
            <View style={tw`flex-row items-center gap-2`}>
              <Text style={tw`text-[10px] text-amber-500 font-extrabold uppercase`}>
                {profile?.isPremium || profile?.premium ? 'ACTIVE VIP' : 'NO PASS'}
              </Text>
              <ChevronRight size={14} color="#525252" />
            </View>
          </TouchableOpacity>

          {/* Settings */}
          <TouchableOpacity 
            onPress={() => setActiveSubScreen('settings')}
            style={tw`flex-row items-center justify-between p-4 border-b border-neutral-800/40`}
          >
            <View style={tw`flex-row items-center gap-3`}>
              <View style={tw`w-8 h-8 rounded-xl bg-neutral-950 border border-neutral-800 items-center justify-center`}>
                <SettingsIcon size={14} color="#a3a3a3" />
              </View>
              <Text style={tw`text-xs font-bold text-neutral-200`}>Settings</Text>
            </View>
            <ChevronRight size={14} color="#525252" />
          </TouchableOpacity>

          {/* Help & Support */}
          <TouchableOpacity 
            onPress={() => setActiveLegalPage('contact')}
            style={tw`flex-row items-center justify-between p-4 border-b border-neutral-800/40`}
          >
            <View style={tw`flex-row items-center gap-3`}>
              <View style={tw`w-8 h-8 rounded-xl bg-neutral-950 border border-neutral-800 items-center justify-center`}>
                <HelpCircle size={14} color="#a3a3a3" />
              </View>
              <Text style={tw`text-xs font-bold text-neutral-200`}>Help & Support</Text>
            </View>
            <ChevronRight size={14} color="#525252" />
          </TouchableOpacity>

          {/* Legal Policies */}
          <TouchableOpacity 
            onPress={() => setActiveLegalPage('privacy')}
            style={tw`flex-row items-center justify-between p-4 border-b border-neutral-800/40`}
          >
            <View style={tw`flex-row items-center gap-3`}>
              <View style={tw`w-8 h-8 rounded-xl bg-neutral-950 border border-neutral-800 items-center justify-center`}>
                <ShieldCheck size={14} color="#a3a3a3" />
              </View>
              <Text style={tw`text-xs font-bold text-neutral-200`}>Legal Policies</Text>
            </View>
            <ChevronRight size={14} color="#525252" />
          </TouchableOpacity>

          {/* About Us */}
          <TouchableOpacity 
            onPress={() => setActiveSubScreen('about')}
            style={tw`flex-row items-center justify-between p-4`}
          >
            <View style={tw`flex-row items-center gap-3`}>
              <View style={tw`w-8 h-8 rounded-xl bg-neutral-950 border border-neutral-800 items-center justify-center`}>
                <Info size={14} color="#a3a3a3" />
              </View>
              <Text style={tw`text-xs font-bold text-neutral-200`}>About Us</Text>
            </View>
            <ChevronRight size={14} color="#525252" />
          </TouchableOpacity>
        </View>

        {/* Short info/footer attribution */}
        <View style={tw`mt-4 items-center`}>
          <Text style={tw`text-[9px] text-neutral-600 font-bold uppercase tracking-widest`}>Story Rush v1.2.0 • Secured via Cashfree</Text>
        </View>
      </View>
    </ScrollView>

    {/* Sub-screen Overlays */}
    {activeSubScreen === 'downloads' && (
      <DownloadsScreen 
        onClose={() => setActiveSubScreen(null)} 
        onSelectDrama={onSelectDrama} 
      />
    )}
    {activeSubScreen === 'history' && (
      <HistoryScreen 
        onClose={() => setActiveSubScreen(null)} 
        onSelectDrama={onSelectDrama}
        currentUser={currentUser}
        historyList={historyList}
      />
    )}
    {activeSubScreen === 'settings' && (
      <SettingsScreen 
        onClose={() => setActiveSubScreen(null)} 
      />
    )}
    {activeSubScreen === 'about' && (
      <AboutScreen 
        onClose={() => setActiveSubScreen(null)} 
        onOpenLegal={(page) => {
          setActiveSubScreen(null);
          setActiveLegalPage(page);
        }}
      />
    )}

    {/* Legal Sub-page Overlay */}
    {activeLegalPage !== null && (
      <LegalPages 
        pageType={activeLegalPage} 
        onClose={() => setActiveLegalPage(null)} 
      />
    )}
    </View>
  );
}
