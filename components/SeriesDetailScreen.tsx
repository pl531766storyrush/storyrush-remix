/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  ActivityIndicator, 
  Share, 
  Platform 
} from 'react-native';
import { collection, query, where, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Drama, Series, mapDocToDrama } from '../types';
import { 
  ArrowLeft, 
  Play, 
  Lock, 
  Heart, 
  MessageCircle, 
  Share2, 
  Sparkles, 
  Film, 
  Zap,
  CheckCircle2,
  Tv
} from 'lucide-react-native';
import tw from 'twrnc';

interface SeriesDetailScreenProps {
  seriesId: string;
  seriesName?: string;
  currentUser: any;
  onClose: () => void;
  onSelectDrama: (dramaId: string) => void;
  onPremiumNav?: () => void;
}

export default function SeriesDetailScreen({ 
  seriesId, 
  seriesName, 
  currentUser, 
  onClose, 
  onSelectDrama, 
  onPremiumNav 
}: SeriesDetailScreenProps) {
  const [episodes, setEpisodes] = useState<Drama[]>([]);
  const [seriesInfo, setSeriesInfo] = useState<Series | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Fetch user profile for premium check
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.isGuest) {
      const loadGuest = () => {
        let guestUser: any = { uid: currentUser.uid, isPremium: false };
        try {
          const stored = localStorage.getItem('storyrush_guest_user');
          if (stored) guestUser = JSON.parse(stored);
        } catch (e) {}
        setUserProfile({ uid: guestUser.uid, isPremium: !!guestUser.isPremium });
      };
      loadGuest();
      const interval = setInterval(loadGuest, 1000);
      return () => clearInterval(interval);
    }

    const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setUserProfile(docSnap.data());
      }
    });
    return () => unsub();
  }, [currentUser]);

  const isUserPremium = !!userProfile?.isPremium;

  // Fetch series object or fallback
  useEffect(() => {
    if (!seriesId) return;
    const unsub = onSnapshot(doc(db, 'series', seriesId), (docSnap) => {
      if (docSnap.exists()) {
        setSeriesInfo({ id: docSnap.id, ...docSnap.data() } as Series);
      }
    }, (err) => {
      console.warn("Series lookup error:", err);
    });
    return () => unsub();
  }, [seriesId]);

  // Fetch all episodes belonging to this series
  useEffect(() => {
    if (!seriesId && !seriesName) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const unsub = onSnapshot(collection(db, 'episodes'), (snapshot) => {
      const all: Drama[] = snapshot.docs.map(docSnap => mapDocToDrama(docSnap.id, docSnap.data()));
      all.sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0));
      
      // Filter by seriesId or normalized seriesName
      const matching = all.filter(ep => {
        if (seriesId && ep.seriesId === seriesId) return true;
        if (seriesName && ep.seriesName && ep.seriesName.trim().toLowerCase() === seriesName.trim().toLowerCase()) return true;
        if (seriesId && ep.seriesName && ep.seriesName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') === seriesId) return true;
        return false;
      });

      setEpisodes(matching);
      setLoading(false);
    }, (err) => {
      console.warn("SeriesDetailScreen episodes lookup error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [seriesId, seriesName]);

  const primaryEpisode = episodes[0];
  const displayTitle = seriesInfo?.name || primaryEpisode?.seriesName || seriesName || primaryEpisode?.title || 'Untitled Series';
  const displayCover = primaryEpisode?.thumbnailUrl || seriesInfo?.thumbnailUrl || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&q=80';
  const displayCategory = seriesInfo?.category || primaryEpisode?.category || 'Drama';
  const displayCreator = seriesInfo?.creator || primaryEpisode?.creator || 'Story Rush Originals';
  const displayDescription = seriesInfo?.description || primaryEpisode?.description || 'Experience high-stakes drama, unexpected twists, and electrifying short stories on Story Rush.';
  const displayTags = seriesInfo?.tags || primaryEpisode?.tags || ['Series', 'BingeWatch', 'ShortDrama'];

  const totalLikes = episodes.reduce((acc, curr) => acc + (curr.likesCount || 0), 0);

  const handleShareSeries = async () => {
    try {
      if (Platform.OS === 'web' && navigator.share) {
        await navigator.share({
          title: displayTitle,
          text: `Watch "${displayTitle}" on Story Rush!`,
          url: window.location.href,
        });
      } else if (Platform.OS === 'web' && navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        alert('Series link copied to clipboard!');
      } else {
        await Share.share({
          message: `Watch "${displayTitle}" on Story Rush!`,
        });
      }
    } catch (e) {
      console.log('Share error:', e);
    }
  };

  return (
    <View style={tw`absolute inset-0 bg-neutral-950 z-50 flex-1`}>
      {/* Top Header Controls */}
      <View style={tw`px-4 py-3 border-b border-neutral-900/80 flex-row items-center justify-between bg-neutral-950/90 z-20`}>
        <TouchableOpacity 
          onPress={onClose}
          style={tw`w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800 items-center justify-center`}
        >
          <ArrowLeft size={16} color="#ffffff" />
        </TouchableOpacity>

        <View style={tw`items-center flex-1 mx-3`}>
          <Text style={tw`text-[10px] font-extrabold text-red-500 uppercase tracking-widest`}>Series Showcase</Text>
          <Text style={tw`text-xs font-black text-white`} numberOfLines={1}>{displayTitle}</Text>
        </View>

        <TouchableOpacity 
          onPress={handleShareSeries}
          style={tw`w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800 items-center justify-center`}
        >
          <Share2 size={16} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={tw`flex-1`}
        contentContainerStyle={tw`pb-28`}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Poster & Gradient Card */}
        <View style={tw`relative w-full h-72 bg-neutral-900`}>
          <Image 
            source={{ uri: displayCover }} 
            style={tw`w-full h-full`}
            resizeMode="cover"
          />
          {/* Dark Vignette Overlay */}
          <View style={tw`absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent`} />

          {/* Hero Overlay Details */}
          <View style={tw`absolute bottom-4 left-4 right-4 gap-2`}>
            <View style={tw`flex-row items-center gap-2 flex-wrap`}>
              <View style={tw`bg-red-600 px-2 py-0.5 rounded-md`}>
                <Text style={tw`text-white text-[9px] font-black uppercase tracking-wider`}>{displayCategory}</Text>
              </View>
              <View style={tw`bg-neutral-900/80 border border-neutral-700/60 px-2 py-0.5 rounded-md`}>
                <Text style={tw`text-neutral-300 text-[9px] font-bold`}>{episodes.length} Episodes</Text>
              </View>
              <View style={tw`bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-md flex-row items-center gap-1`}>
                <Sparkles size={10} color="#f59e0b" />
                <Text style={tw`text-amber-400 text-[9px] font-extrabold`}>Story Rush Original</Text>
              </View>
            </View>

            <Text style={tw`text-xl font-black text-white tracking-wide leading-tight`}>{displayTitle}</Text>
            
            <Text style={tw`text-[11px] text-neutral-300 font-medium`}>
              Created by <Text style={tw`text-red-400 font-bold`}>@{displayCreator}</Text>
            </Text>
          </View>
        </View>

        {/* Action Button & Stats Row */}
        <View style={tw`px-4 pt-3 pb-4 border-b border-neutral-900/80 gap-4`}>
          {episodes.length > 0 && (
            <TouchableOpacity 
              onPress={() => {
                onSelectDrama(episodes[0].id);
                onClose();
              }}
              style={tw`w-full bg-red-600 py-3.5 rounded-2xl flex-row items-center justify-center gap-2 shadow-lg`}
            >
              <Play size={18} color="#ffffff" fill="#ffffff" />
              <Text style={tw`text-white font-black text-xs uppercase tracking-wider`}>
                Play Episode 1
              </Text>
            </TouchableOpacity>
          )}

          {/* Stats Badges */}
          <View style={tw`flex-row items-center justify-around bg-neutral-900/60 border border-neutral-800/80 p-3 rounded-2xl`}>
            <View style={tw`items-center`}>
              <Text style={tw`text-xs font-black text-white`}>{episodes.length}</Text>
              <Text style={tw`text-[9px] text-neutral-400 font-bold uppercase mt-0.5`}>Episodes</Text>
            </View>
            <View style={tw`w-px h-6 bg-neutral-800`} />
            <View style={tw`items-center`}>
              <Text style={tw`text-xs font-black text-white`}>{totalLikes}</Text>
              <Text style={tw`text-[9px] text-neutral-400 font-bold uppercase mt-0.5`}>Total Likes</Text>
            </View>
            <View style={tw`w-px h-6 bg-neutral-800`} />
            <View style={tw`items-center`}>
              <Text style={tw`text-xs font-black text-emerald-400`}>HD Stream</Text>
              <Text style={tw`text-[9px] text-neutral-400 font-bold uppercase mt-0.5`}>Quality</Text>
            </View>
          </View>

          {/* Synopsis */}
          <View style={tw`gap-1.5`}>
            <Text style={tw`text-xs font-black text-neutral-200 uppercase tracking-wider`}>Synopsis</Text>
            <Text style={tw`text-xs text-neutral-400 leading-relaxed`}>{displayDescription}</Text>
          </View>

          {/* Tags */}
          {displayTags && displayTags.length > 0 && (
            <View style={tw`flex-row flex-wrap gap-1.5`}>
              {displayTags.map((tag, idx) => (
                <View key={idx} style={tw`bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded-lg`}>
                  <Text style={tw`text-[10px] text-neutral-400 font-mono font-semibold`}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Premium Upgrade Banner if non-premium */}
        {!isUserPremium && (
          <View style={tw`mx-4 mt-4 bg-gradient-to-r from-amber-500/10 to-red-600/10 border border-amber-500/30 p-4 rounded-2xl flex-row items-center justify-between`}>
            <View style={tw`flex-1 mr-3`}>
              <View style={tw`flex-row items-center gap-1.5 mb-1`}>
                <Zap size={14} color="#f59e0b" />
                <Text style={tw`text-xs font-black text-amber-400 uppercase tracking-wider`}>Unlock All Episodes</Text>
              </View>
              <Text style={tw`text-[10px] text-neutral-400 leading-normal`}>
                Get unrestricted access to premium locked episodes ad-free.
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => {
                onClose();
                if (onPremiumNav) onPremiumNav();
              }}
              style={tw`bg-amber-500 px-3 py-2 rounded-xl border border-amber-400`}
            >
              <Text style={tw`text-black text-[10px] font-black uppercase tracking-wider`}>Upgrade VIP</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Episodes List Header */}
        <View style={tw`px-4 pt-6 pb-3 flex-row items-center justify-between`}>
          <View style={tw`flex-row items-center gap-2`}>
            <Tv size={16} color="#ef4444" />
            <Text style={tw`text-xs font-black text-white uppercase tracking-wider`}>
              All Episodes ({episodes.length})
            </Text>
          </View>
          <Text style={tw`text-[10px] text-neutral-500 font-bold uppercase`}>Sequential Order</Text>
        </View>

        {/* Episodes Grid/List */}
        {loading ? (
          <View style={tw`py-12 items-center`}>
            <ActivityIndicator size="small" color="#dc2626" />
            <Text style={tw`text-[11px] text-neutral-500 mt-2`}>Loading series episodes...</Text>
          </View>
        ) : episodes.length === 0 ? (
          <View style={tw`px-4 py-10 items-center bg-neutral-900/40 rounded-2xl mx-4 border border-neutral-800`}>
            <Film size={28} color="#525252" style={tw`mb-2`} />
            <Text style={tw`text-xs font-bold text-neutral-300`}>No episodes found</Text>
            <Text style={tw`text-[10px] text-neutral-500 text-center mt-1`}>
              Episodes for this series are being uploaded. Check back soon!
            </Text>
          </View>
        ) : (
          <View style={tw`px-4 gap-3`}>
            {episodes.map((ep) => {
              const isLocked = !!ep.isPremium && !isUserPremium;

              return (
                <TouchableOpacity
                  key={ep.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    onSelectDrama(ep.id);
                    onClose();
                  }}
                  style={tw`bg-neutral-900/70 border border-neutral-800/80 p-3 rounded-2xl flex-row items-center gap-3`}
                >
                  {/* Thumbnail Card */}
                  <View style={tw`w-20 h-24 rounded-xl overflow-hidden bg-neutral-950 relative shrink-0`}>
                    <Image 
                      source={{ uri: ep.thumbnailUrl }} 
                      style={[tw`w-full h-full`, isLocked && { opacity: 0.5 }]} 
                      resizeMode="cover" 
                    />
                    
                    {/* Play/Lock Overlay */}
                    <View style={tw`absolute inset-0 bg-black/30 items-center justify-center`}>
                      {isLocked ? (
                        <View style={tw`w-7 h-7 rounded-full bg-amber-500 items-center justify-center shadow-md`}>
                          <Lock size={12} color="#ffffff" />
                        </View>
                      ) : (
                        <View style={tw`w-7 h-7 rounded-full bg-red-600 items-center justify-center shadow-md`}>
                          <Play size={12} color="#ffffff" fill="#ffffff" style={tw`ml-0.5`} />
                        </View>
                      )}
                    </View>

                    {/* Ep Number tag */}
                    <View style={tw`absolute top-1 left-1 bg-black/80 px-1.5 py-0.5 rounded`}>
                      <Text style={tw`text-[8px] font-mono font-bold text-red-500`}>EP {ep.episodeNumber}</Text>
                    </View>
                  </View>

                  {/* Episode Info */}
                  <View style={tw`flex-1 justify-center gap-1`}>
                    <View style={tw`flex-row items-center gap-1.5`}>
                      <Text style={tw`text-xs font-black text-white`} numberOfLines={1}>
                        Episode {ep.episodeNumber}: {ep.title}
                      </Text>
                      {ep.isPremium && (
                        <View style={tw`bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 rounded`}>
                          <Text style={tw`text-amber-400 text-[8px] font-black uppercase`}>VIP</Text>
                        </View>
                      )}
                    </View>

                    <Text style={tw`text-[10px] text-neutral-400 leading-tight`} numberOfLines={2}>
                      {ep.description}
                    </Text>

                    <View style={tw`flex-row items-center gap-3 mt-1`}>
                      <View style={tw`flex-row items-center`}>
                        <Heart size={10} color="#ef4444" fill="#ef4444" style={tw`mr-1`} />
                        <Text style={tw`text-[9px] text-neutral-400 font-bold`}>{ep.likesCount || 0}</Text>
                      </View>
                      <View style={tw`flex-row items-center`}>
                        <MessageCircle size={10} color="#737373" style={tw`mr-1`} />
                        <Text style={tw`text-[9px] text-neutral-400 font-bold`}>{ep.commentsCount || 0}</Text>
                      </View>
                      <Text style={tw`text-[9px] text-neutral-500 font-mono ml-auto`}>
                        {Math.floor(ep.duration / 60)}:{(ep.duration % 60).toString().padStart(2, '0')}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
