/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  Alert 
} from 'react-native';
import { 
  ArrowLeft, 
  History as HistoryIcon, 
  Trash2, 
  Play, 
  Clock, 
  Film,
  Sparkles
} from 'lucide-react-native';
import tw from 'twrnc';

interface HistoryScreenProps {
  onClose: () => void;
  onSelectDrama?: (dramaId: string) => void;
  currentUser?: any;
  historyList?: any[];
}

export default function HistoryScreen({ 
  onClose, 
  onSelectDrama, 
  currentUser,
  historyList = []
}: HistoryScreenProps) {
  const [localHistory, setLocalHistory] = useState<any[]>(historyList);

  const handleClearHistory = () => {
    if (localHistory.length === 0) return;
    Alert.alert(
      "Clear Watch History",
      "Are you sure you want to delete your entire watch history log?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear All", 
          style: "destructive",
          onPress: () => {
            setLocalHistory([]);
            if (currentUser?.uid) {
              try {
                localStorage.removeItem(`history_${currentUser.uid}`);
              } catch (e) {}
            }
          }
        }
      ]
    );
  };

  const displayList = localHistory.length > 0 ? localHistory : historyList;

  return (
    <View style={tw`absolute inset-0 z-50 bg-black flex-1`}>
      {/* Header */}
      <View style={tw`px-4 py-3.5 bg-neutral-950 border-b border-neutral-900 flex-row items-center justify-between`}>
        <TouchableOpacity 
          onPress={onClose}
          style={tw`w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800 items-center justify-center`}
        >
          <ArrowLeft size={18} color="#ffffff" />
        </TouchableOpacity>
        <View style={tw`items-center`}>
          <Text style={tw`text-sm font-black text-white uppercase tracking-wider`}>Watch History</Text>
          <Text style={tw`text-[10px] text-neutral-400 font-medium`}>Recently Viewed Episodes</Text>
        </View>
        <TouchableOpacity 
          onPress={handleClearHistory}
          style={tw`px-2.5 py-1 bg-red-950/40 border border-red-900/50 rounded-lg`}
        >
          <Text style={tw`text-[10px] font-extrabold text-red-500 uppercase`}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`p-4 pb-20`} showsVerticalScrollIndicator={false}>
        <View style={tw`mb-4 flex-row items-center justify-between`}>
          <View style={tw`flex-row items-center gap-2`}>
            <Clock size={16} color="#ef4444" />
            <Text style={tw`text-xs font-black text-white uppercase tracking-wider`}>
              History Logs ({displayList.length})
            </Text>
          </View>
        </View>

        {displayList.length === 0 ? (
          <View style={tw`py-16 items-center bg-neutral-900/40 rounded-3xl border border-neutral-800/60 p-6 text-center`}>
            <HistoryIcon size={36} color="#525252" style={tw`mb-3`} />
            <Text style={tw`text-xs font-black text-neutral-300 uppercase tracking-wider`}>No Watch History</Text>
            <Text style={tw`text-[10px] text-neutral-500 mt-1 max-w-[240px] text-center leading-relaxed`}>
              Episodes you watch will appear here automatically so you can jump straight back into the action.
            </Text>
          </View>
        ) : (
          <View style={tw`gap-3`}>
            {displayList.map((item, idx) => {
              const drama = item.drama || item;
              const title = drama.title || item.title || `Episode ${item.episodeNumber || 1}`;
              const seriesName = drama.seriesName || item.seriesName || 'Short Drama';
              const thumb = drama.thumbnailUrl || item.thumbnailUrl || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&q=80';
              const epNum = drama.episodeNumber || item.episodeNumber || 1;
              const dramaId = drama.id || item.dramaId;

              return (
                <TouchableOpacity 
                  key={item.id || dramaId || idx}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (dramaId && onSelectDrama) {
                      onSelectDrama(dramaId);
                      onClose();
                    }
                  }}
                  style={tw`bg-neutral-900/80 border border-neutral-800/80 p-3 rounded-2xl flex-row items-center gap-3.5`}
                >
                  {/* Thumbnail */}
                  <View style={tw`w-20 h-24 rounded-xl overflow-hidden bg-neutral-950 relative shrink-0 border border-neutral-800`}>
                    <Image source={{ uri: thumb }} style={tw`w-full h-full`} resizeMode="cover" />
                    <View style={tw`absolute inset-0 bg-black/40 items-center justify-center`}>
                      <View style={tw`w-8 h-8 rounded-full bg-red-600/90 items-center justify-center shadow-lg`}>
                        <Play size={12} color="#ffffff" fill="#ffffff" style={tw`ml-0.5`} />
                      </View>
                    </View>
                    <View style={tw`absolute top-1 left-1 bg-black/80 px-1.5 py-0.5 rounded`}>
                      <Text style={tw`text-[8px] font-mono font-bold text-red-500`}>EP {epNum}</Text>
                    </View>
                  </View>

                  {/* Details */}
                  <View style={tw`flex-1 justify-center`}>
                    <Text style={tw`text-amber-400 text-[9px] font-black uppercase tracking-wider mb-0.5`} numberOfLines={1}>
                      {seriesName}
                    </Text>
                    <Text style={tw`text-xs font-black text-white mb-1`} numberOfLines={1}>
                      {title}
                    </Text>
                    
                    <View style={tw`flex-row items-center gap-1.5 mt-1`}>
                      <View style={tw`bg-red-600/20 px-2 py-0.5 rounded border border-red-500/30`}>
                        <Text style={tw`text-[9px] text-red-400 font-extrabold uppercase`}>Resume</Text>
                      </View>
                      <Text style={tw`text-[9px] text-neutral-500 font-medium`}>
                        {item.watchedAt ? new Date(item.watchedAt).toLocaleDateString() : 'Recently'}
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
