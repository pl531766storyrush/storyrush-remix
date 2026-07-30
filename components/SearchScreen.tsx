/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  ScrollView, 
  Image 
} from 'react-native';
import { collection, onSnapshot, query, where, orderBy, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../firebase';
import { Drama, mapDocToDrama } from '../types';
import { Search, X, Flame, Play, Award, Lock } from 'lucide-react-native';
import tw from 'twrnc';

interface SearchScreenProps {
  currentUser: any;
  onSelectDrama: (dramaId: string) => void;
  onOpenSeries?: (seriesId: string, seriesName: string) => void;
}

interface SeriesExploreItem {
  id: string;
  name: string;
  category: string;
  thumbnailUrl: string;
  creator: string;
}

export default function SearchScreen({ currentUser, onSelectDrama, onOpenSeries }: SearchScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [seriesExploreList, setSeriesExploreList] = useState<SeriesExploreItem[]>([]);
  const [exploreTab, setExploreTab] = useState<'trending' | 'genres'>('trending');
  const [selectedGenre, setSelectedGenre] = useState<string>('Romance');
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Listen to Firestore profile updates for subscription validation
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.isGuest) {
      const loadGuestProfile = () => {
        let guestUser: any = { uid: currentUser.uid, isPremium: false };
        try {
          const stored = localStorage.getItem('storyrush_guest_user');
          if (stored) {
            guestUser = JSON.parse(stored);
          }
        } catch (e) {}

        setUserProfile({
          uid: guestUser.uid,
          isPremium: !!guestUser.isPremium,
        });
      };

      loadGuestProfile();
      const interval = setInterval(loadGuestProfile, 1000);
      return () => clearInterval(interval);
    }
    const unsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setUserProfile(docSnap.data());
      }
    });
    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  const isUserPremium = !!userProfile?.isPremium;

  useEffect(() => {
    setLoading(true);

    let seriesFromDb: SeriesExploreItem[] = [];
    let allDramas: Drama[] = [];

    const buildData = () => {
      setDramas(allDramas);

      const groups: Record<string, Drama[]> = {};
      allDramas.forEach(d => {
        const sKey = d.seriesId || (d.seriesName ? d.seriesName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') : '');
        if (!sKey) return;
        if (!groups[sKey]) groups[sKey] = [];
        groups[sKey].push(d);
      });

      const combined: SeriesExploreItem[] = [];
      const processed = new Set<string>();

      seriesFromDb.forEach(s => {
        const normalizedKey = s.name ? s.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') : s.id;
        const matchingEps = groups[s.id] || groups[normalizedKey] || [];

        processed.add(s.id);
        processed.add(normalizedKey);
        const primaryEp = matchingEps[0];
        const latestThumb = s.thumbnailUrl || primaryEp?.thumbnailUrl || '';

        if (s.id && s.name && latestThumb) {
          combined.push({
            id: s.id,
            name: s.name,
            category: s.category || primaryEp?.category || 'Romance',
            thumbnailUrl: latestThumb,
            creator: s.creator || primaryEp?.creator || 'Story Rush'
          });
        }
      });

      Object.keys(groups).forEach(key => {
        if (!processed.has(key)) {
          const primaryEp = groups[key][0];
          if (primaryEp) {
            const derivedTitle = (primaryEp.seriesName || primaryEp.title || '').trim();
            const thumb = (primaryEp.thumbnailUrl || '').trim();
            if (key && derivedTitle && thumb && !derivedTitle.toLowerCase().includes('untitled')) {
              combined.push({
                id: key,
                name: derivedTitle,
                category: primaryEp.category || 'Romance',
                thumbnailUrl: thumb,
                creator: primaryEp.creator || 'Story Rush'
              });
            }
          }
        }
      });

      // Filter to ensure only completely valid series exist (must have id, name, thumbnailUrl, and not untitled)
      const validSeries = combined.filter(s => !!s.id && !!s.name && !!s.thumbnailUrl && !s.name.toLowerCase().includes('untitled'));

      setSeriesExploreList(validSeries);
      setLoading(false);
    };

    const unsubSeries = onSnapshot(collection(db, 'series'), (seriesSnap) => {
      seriesFromDb = seriesSnap.docs
        .map(docSnap => {
          const data = docSnap.data();
          const name = (data.name || data.title || '').trim();
          const thumbnailUrl = (data.thumbnailUrl || data.thumbnail || '').trim();
          const id = (docSnap.id || data.id || '').trim();
          if (!id || !name || !thumbnailUrl || name.toLowerCase().includes('untitled')) {
            return null;
          }
          return {
            id,
            name,
            category: data.category || 'Romance',
            thumbnailUrl,
            creator: data.creator || 'Story Rush'
          };
        })
        .filter((item): item is SeriesExploreItem => item !== null);
      buildData();
    }, (err) => {
      console.warn("SearchScreen series lookup error:", err);
      buildData();
    });

    const unsubEpisodes = onSnapshot(collection(db, 'episodes'), (snapshot) => {
      allDramas = snapshot.docs.map(docSnap => mapDocToDrama(docSnap.id, docSnap.data()));
      buildData();
    }, (err) => {
      console.warn("SearchScreen episodes lookup error:", err);
      buildData();
    });

    return () => {
      unsubSeries();
      unsubEpisodes();
    };
  }, []);

  // Filter dramas based on search query
  const filteredDramas = dramas.filter((drama) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return false;
    return (
      drama.title.toLowerCase().includes(q) ||
      drama.seriesName.toLowerCase().includes(q) ||
      drama.category.toLowerCase().includes(q) ||
      drama.description.toLowerCase().includes(q) ||
      drama.tags.some(tag => tag.toLowerCase().includes(q))
    );
  });

  const filteredExploreSeries = seriesExploreList.filter(s => 
    s.category.toLowerCase().includes(selectedGenre.toLowerCase())
  );

  const popularSearches = [
    'CEO Secret Bride',
    'Shadow Ninja',
    'Horror Ritual',
    'Romance',
    'Thriller'
  ];

  return (
    <View style={tw`flex-1 bg-black`}>
      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`px-4 pt-6 pb-28`} showsVerticalScrollIndicator={false}>
        {/* Explore Header */}
        <View style={tw`mb-4`}>
          <Text style={tw`text-xl font-black text-white tracking-wide uppercase`}>
            Explore <Text style={tw`text-red-600`}>Dramas</Text>
          </Text>
          <Text style={tw`text-[10px] text-neutral-400 mt-0.5`}>Discover trending series, genres, and top blockbusters</Text>
        </View>

        {/* Top Search Input */}
        <View style={tw`relative mb-5`}>
          <Search size={16} color="#737373" style={tw`absolute left-4 top-3.5 z-10`} />
          <TextInput
            placeholder="Search series, titles, or tags..."
            placeholderTextColor="#737373"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={tw`w-full bg-neutral-900 text-xs text-white pl-11 pr-11 py-3.5 rounded-2xl border border-neutral-800 focus:border-red-600`}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={tw`absolute right-4 top-3.5 z-10`}
            >
              <X size={16} color="#737373" />
            </TouchableOpacity>
          )}
        </View>

        {/* When NO search query is entered, show Trending & Genres Tabs */}
        {!searchQuery && (
          <View style={tw`gap-5`}>
            {/* Tab Toggle: Trending vs Genres */}
            <View style={tw`flex-row bg-neutral-900/80 p-1 rounded-2xl border border-neutral-800`}>
              <TouchableOpacity
                onPress={() => setExploreTab('trending')}
                style={tw`flex-1 py-2 rounded-xl flex-row items-center justify-center gap-1.5 ${
                  exploreTab === 'trending' ? 'bg-red-600' : 'bg-transparent'
                }`}
              >
                <Flame size={14} color={exploreTab === 'trending' ? '#ffffff' : '#a3a3a3'} />
                <Text style={tw`text-xs font-black uppercase ${
                  exploreTab === 'trending' ? 'text-white' : 'text-neutral-400'
                }`}>Trending</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setExploreTab('genres')}
                style={tw`flex-1 py-2 rounded-xl flex-row items-center justify-center gap-1.5 ${
                  exploreTab === 'genres' ? 'bg-red-600' : 'bg-transparent'
                }`}
              >
                <Award size={14} color={exploreTab === 'genres' ? '#ffffff' : '#a3a3a3'} />
                <Text style={tw`text-xs font-black uppercase ${
                  exploreTab === 'genres' ? 'text-white' : 'text-neutral-400'
                }`}>Genres</Text>
              </TouchableOpacity>
            </View>

            {/* Popular Search Pills */}
            <View style={tw`flex-row flex-wrap gap-2`}>
              {popularSearches.map((term, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setSearchQuery(term)}
                  style={tw`bg-neutral-900/80 px-3 py-1.5 rounded-xl border border-neutral-800`}
                >
                  <Text style={tw`text-[10px] text-neutral-300 font-bold`}>#{term}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* TRENDING TAB CONTENT */}
            {exploreTab === 'trending' && (
              <View style={tw`gap-4`}>
                <View style={tw`flex-row items-center justify-between`}>
                  <Text style={tw`text-xs font-black text-white uppercase tracking-wider`}>
                    Trending Series Posters
                  </Text>
                  <Text style={tw`text-[10px] text-red-500 font-extrabold uppercase`}>Popular</Text>
                </View>

                {/* Clean Poster Grid */}
                {seriesExploreList.length === 0 ? (
                  <View style={tw`w-full py-12 items-center bg-neutral-900/40 rounded-2xl border border-neutral-800`}>
                    <Text style={tw`text-xs text-neutral-400 font-bold`}>No series found</Text>
                  </View>
                ) : (
                  <View style={tw`flex-row flex-wrap justify-between gap-y-4`}>
                    {seriesExploreList.map((series, idx) => (
                      <TouchableOpacity
                        key={series.id}
                        activeOpacity={0.8}
                        onPress={() => {
                          if (onOpenSeries) onOpenSeries(series.id, series.name);
                        }}
                        style={tw`w-[48%] rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800/80 shadow-lg`}
                      >
                        <View style={tw`w-full h-56 relative bg-neutral-950`}>
                          <Image 
                            source={{ uri: series.thumbnailUrl }} 
                            style={tw`w-full h-full`}
                            resizeMode="cover"
                          />
                          <View style={tw`absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent`} />

                          {/* Rank Badge */}
                          <View style={tw`absolute top-2 left-2 bg-red-600 px-2 py-0.5 rounded-lg border border-red-400`}>
                            <Text style={tw`text-white text-[9px] font-black italic`}>#{idx + 1}</Text>
                          </View>

                          <View style={tw`absolute bottom-2.5 left-2.5 right-2.5`}>
                            <Text style={tw`text-xs font-black text-white leading-snug`} numberOfLines={2}>
                              {series.name}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* GENRES TAB CONTENT */}
            {exploreTab === 'genres' && (
              <View style={tw`gap-4`}>
                {/* Genre Filter Pills */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`gap-2 pb-1`}>
                  {['Romance', 'Action', 'Horror', 'Comedy', 'Thriller'].map((genre) => {
                    const isActive = selectedGenre.toLowerCase() === genre.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={genre}
                        onPress={() => setSelectedGenre(genre)}
                        style={tw`px-4 py-2 rounded-full border ${
                          isActive ? 'bg-red-600 border-red-500' : 'bg-neutral-900 border-neutral-800'
                        }`}
                      >
                        <Text style={tw`text-xs font-extrabold ${isActive ? 'text-white' : 'text-neutral-400'}`}>
                          {genre}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Genre Poster Grid */}
                <View style={tw`flex-row flex-wrap justify-between gap-y-4`}>
                  {filteredExploreSeries.length === 0 ? (
                    <View style={tw`w-full py-12 items-center bg-neutral-900/40 rounded-2xl border border-neutral-800`}>
                      <Text style={tw`text-xs text-neutral-400 font-bold`}>No series found</Text>
                    </View>
                  ) : (
                    filteredExploreSeries.map((series) => (
                      <TouchableOpacity
                        key={series.id}
                        activeOpacity={0.8}
                        onPress={() => {
                          if (onOpenSeries) onOpenSeries(series.id, series.name);
                        }}
                        style={tw`w-[48%] rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800/80 shadow-lg`}
                      >
                        <View style={tw`w-full h-56 relative bg-neutral-950`}>
                          <Image 
                            source={{ uri: series.thumbnailUrl }} 
                            style={tw`w-full h-full`}
                            resizeMode="cover"
                          />
                          <View style={tw`absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent`} />

                          <View style={tw`absolute top-2 left-2 bg-black/80 px-2 py-0.5 rounded border border-neutral-700`}>
                            <Text style={tw`text-amber-400 text-[8px] font-black uppercase`}>{series.category}</Text>
                          </View>

                          <View style={tw`absolute bottom-2.5 left-2.5 right-2.5`}>
                            <Text style={tw`text-xs font-black text-white leading-snug`} numberOfLines={2}>
                              {series.name}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              </View>
            )}
          </View>
        )}

        {/* SEARCH RESULTS SECTION */}
        {searchQuery.length > 0 && (
          <View style={tw`gap-4 pb-12`}>
            <Text style={tw`text-xs font-bold text-neutral-400 uppercase tracking-wider`}>
              Search Results ({filteredDramas.length})
            </Text>

            {loading ? (
              <View style={tw`py-8 items-center`}>
                <ActivityIndicator size="small" color="#dc2626" />
              </View>
            ) : filteredDramas.length === 0 ? (
              <View style={tw`items-center py-12 bg-neutral-900/40 rounded-2xl border border-neutral-800`}>
                <Text style={tw`text-neutral-400 text-xs font-bold`}>
                  No dramas match "<Text style={tw`text-white font-black`}>{searchQuery}</Text>".
                </Text>
                <Text style={tw`text-[10px] text-neutral-500 mt-1`}>Try another keyword!</Text>
              </View>
            ) : (
              <View style={tw`flex-row flex-wrap justify-between gap-y-4`}>
                {filteredDramas.map((drama) => {
                  const isDramaLocked = !!drama.isPremium && !isUserPremium;
                  return (
                    <TouchableOpacity
                      key={drama.id}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (onOpenSeries) {
                          const sId = drama.seriesId || drama.seriesName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                          onOpenSeries(sId, drama.seriesName);
                        } else {
                          onSelectDrama(drama.id);
                        }
                      }}
                      style={tw`w-[48%] rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800/80 shadow-lg`}
                    >
                      <View style={tw`w-full h-56 relative bg-neutral-950`}>
                        <Image 
                          source={{ uri: drama.thumbnailUrl }} 
                          style={[tw`w-full h-full`, isDramaLocked && { opacity: 0.6 }]} 
                          resizeMode="cover" 
                        />
                        <View style={tw`absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent`} />

                        {/* Lock / Play Overlay */}
                        <View style={tw`absolute top-2 right-2`}>
                          {isDramaLocked ? (
                            <View style={tw`w-6 h-6 rounded-full bg-amber-500 items-center justify-center shadow-md`}>
                              <Lock size={10} color="#ffffff" />
                            </View>
                          ) : (
                            <View style={tw`w-6 h-6 rounded-full bg-red-600 items-center justify-center shadow-md`}>
                              <Play size={10} color="#ffffff" fill="#ffffff" style={tw`ml-0.5`} />
                            </View>
                          )}
                        </View>

                        <View style={tw`absolute top-2 left-2 bg-black/80 px-1.5 py-0.5 rounded`}>
                          <Text style={tw`text-red-500 text-[8px] font-mono font-bold`}>EP {drama.episodeNumber}</Text>
                        </View>

                        <View style={tw`absolute bottom-2.5 left-2.5 right-2.5`}>
                          <Text style={tw`text-xs font-black text-white leading-snug`} numberOfLines={1}>
                            {drama.seriesName}
                          </Text>
                          <Text style={tw`text-[9px] text-neutral-400 mt-0.5`} numberOfLines={1}>
                            {drama.title}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
