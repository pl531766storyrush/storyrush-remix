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
  FlatList, 
  ScrollView, 
  Image 
} from 'react-native';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Category, Drama, mapDocToDrama, Series } from '../types';
import { Film, Sparkles } from 'lucide-react-native';
import tw from 'twrnc';

interface CategoriesScreenProps {
  currentUser: any;
  onSelectDrama: (dramaId: string) => void;
  onOpenSeries?: (seriesId: string, seriesName: string) => void;
  initialCategory?: Category | null;
}

interface SeriesCategoryItem {
  id: string;
  name: string;
  category: string;
  thumbnailUrl: string;
}

export default function CategoriesScreen({ currentUser, onSelectDrama, onOpenSeries, initialCategory }: CategoriesScreenProps) {
  const [seriesList, setSeriesList] = useState<SeriesCategoryItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>(Category.ROMANCE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initialCategory) {
      setActiveCategory(initialCategory);
    }
  }, [initialCategory]);

  useEffect(() => {
    setLoading(true);

    let seriesDocs: Series[] = [];
    let episodeDocs: Drama[] = [];

    const buildData = () => {
      // Group episodes by seriesId or normalized seriesName key
      const groups: { [seriesId: string]: Drama[] } = {};
      episodeDocs.forEach(d => {
        const sKey = d.seriesId || (d.seriesName ? d.seriesName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') : 'default_series');
        if (!groups[sKey]) groups[sKey] = [];
        groups[sKey].push(d);
      });

      const combinedSeries: SeriesCategoryItem[] = [];
      const processedKeys = new Set<string>();

      // 1. Process explicit series from 'series' collection
      seriesDocs.forEach(s => {
        const normalizedKey = s.name ? s.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') : s.id;
        const matchingEps = groups[s.id] || groups[normalizedKey] || [];

        // Skip empty series documents that have no name and no matching episodes
        if (!s.name && matchingEps.length === 0) return;

        processedKeys.add(s.id);
        processedKeys.add(normalizedKey);

        const primaryEp = matchingEps[0];
        combinedSeries.push({
          id: s.id,
          name: s.name || primaryEp?.seriesName || primaryEp?.title || s.id,
          category: s.category || primaryEp?.category || 'Romance',
          thumbnailUrl: primaryEp?.thumbnailUrl || s.thumbnailUrl || ''
        });
      });

      // 2. Process remaining groups from 'episodes' collection
      Object.keys(groups).forEach(key => {
        if (!processedKeys.has(key)) {
          const matchingEps = groups[key];
          if (matchingEps.length > 0) {
            const primaryEp = matchingEps[0];
            const derivedTitle = primaryEp.seriesName || primaryEp.title || 'Untitled Series';
            combinedSeries.push({
              id: key,
              name: derivedTitle,
              category: primaryEp.category || 'Romance',
              thumbnailUrl: primaryEp.thumbnailUrl || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&q=80'
            });
          }
        }
      });

      setSeriesList(combinedSeries);
      setLoading(false);
    };

    const unsubSeries = onSnapshot(collection(db, 'series'), (seriesSnap) => {
      seriesDocs = seriesSnap.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as Series));
      buildData();
    }, (err) => {
      console.warn("CategoriesScreen series lookup error:", err);
      buildData();
    });

    const unsubEpisodes = onSnapshot(collection(db, 'episodes'), (snapshot) => {
      episodeDocs = snapshot.docs.map(docSnap => mapDocToDrama(docSnap.id, docSnap.data()));
      buildData();
    }, (err) => {
      console.warn("CategoriesScreen episodes lookup error:", err);
      buildData();
    });

    return () => {
      unsubSeries();
      unsubEpisodes();
    };
  }, []);

  const [categoriesList, setCategoriesList] = useState<any[]>([
    { key: Category.ROMANCE, label: 'Romance 💖', desc: 'Heartwarming encounters & forbidden desires' },
    { key: Category.ACTION, label: 'Action ⚡', desc: 'High-octane stuntwork & cinematic combat' },
    { key: Category.HORROR, label: 'Horror 👻', desc: 'Eerie cults & heart-stopping supernatural thrills' },
    { key: Category.COMEDY, label: 'Comedy 😂', desc: 'Quirky dynamics & laugh-out-loud moments' },
    { key: Category.THRILLER, label: 'Thriller 🔪', desc: 'Mind-bending conspiracies & betrayal' }
  ]);

  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = onSnapshot(collection(db, 'categories'), (snapshot) => {
      if (!snapshot.empty) {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            key: (data.name as string) as Category,
            label: `${data.name} ${data.icon || ''}`,
            desc: data.desc || ''
          });
        });
        list.sort((a, b) => a.key.localeCompare(b.key));
        setCategoriesList(list);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'categories');
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Filter series list by active genre/category
  const filteredSeries = seriesList.filter(s => 
    s.category && s.category.toLowerCase() === activeCategory.toLowerCase()
  );

  const handleSeriesPress = (item: SeriesCategoryItem) => {
    if (onOpenSeries) {
      onOpenSeries(item.id, item.name);
    }
  };

  const renderSeriesCard = ({ item }: { item: SeriesCategoryItem }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => handleSeriesPress(item)}
        style={tw`flex-1 m-2`}
      >
        {/* Clean Poster Cover */}
        <View style={tw`w-full rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800/80 shadow-lg relative`}>
          <View style={[tw`relative bg-neutral-950`, { aspectRatio: 2 / 3 }]}>
            <Image
              source={{ uri: item.thumbnailUrl }}
              style={tw`w-full h-full`}
              resizeMode="cover"
            />
            {/* Subtle Gradient overlay */}
            <View style={tw`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent`} />
          </View>
        </View>

        {/* Series Title Only */}
        <View style={tw`mt-2 px-1`}>
          <Text 
            style={tw`text-xs font-black text-white leading-snug`} 
            numberOfLines={2}
          >
            {item.name}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={tw`flex-1 bg-black px-4 pt-6`}>
      {/* Visual Header */}
      <View style={tw`mb-4 flex-row items-center justify-between`}>
        <View>
          <Text style={tw`text-xl font-black text-white tracking-wide uppercase`}>
            Browse <Text style={tw`text-[#e50914]`}>Genres</Text>
          </Text>
          <Text style={tw`text-[10px] text-neutral-400 mt-0.5`}>Discover short drama series by genre</Text>
        </View>
        <Film size={20} color="#e50914" />
      </View>

      {/* Categories Horizontal Tabs */}
      <View style={tw`h-12 shrink-0 mb-2`}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw`flex-row gap-2 pb-2`}
        >
          {categoriesList.map((cat) => {
            const isActive = activeCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                onPress={() => setActiveCategory(cat.key)}
                style={tw`px-4 py-2 rounded-full border ${
                  isActive
                    ? 'bg-[#e50914] border-[#e50914]'
                    : 'bg-neutral-900 border-neutral-800'
                }`}
              >
                <Text style={tw`text-xs font-extrabold ${
                  isActive ? 'text-white' : 'text-neutral-400'
                }`}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Active category tagline */}
      <View style={tw`bg-neutral-900/60 p-3 rounded-2xl border border-neutral-800/60 mb-4 flex-row items-center`}>
        <Sparkles size={14} color="#e50914" style={tw`mr-2.5`} />
        <Text style={tw`text-xs font-bold text-neutral-300 flex-1`} numberOfLines={1}>
          {categoriesList.find(c => c.key === activeCategory)?.desc || 'Top short drama series'}
        </Text>
      </View>

      {/* Grid Content: Only Unique Series Cards */}
      {loading ? (
        <View style={tw`flex-1 items-center justify-center py-12`}>
          <ActivityIndicator size="small" color="#e50914" />
          <Text style={tw`text-[11px] text-neutral-500 mt-2`}>Loading series...</Text>
        </View>
      ) : filteredSeries.length === 0 ? (
        <View style={tw`flex-1 items-center justify-center py-16 text-center`}>
          <Film size={32} color="#404040" style={tw`mb-3`} />
          <Text style={tw`text-xs font-bold text-neutral-400`}>No Series Found</Text>
          <Text style={tw`text-[10px] text-neutral-500 max-w-[220px] text-center mt-1.5 leading-relaxed`}>
            No series currently available in this genre.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredSeries}
          keyExtractor={(item) => item.id}
          renderItem={renderSeriesCard}
          numColumns={2}
          contentContainerStyle={tw`pb-28`}
          columnWrapperStyle={tw`justify-between`}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
