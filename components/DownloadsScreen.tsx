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
  Download, 
  Trash2, 
  Play, 
  HardDrive, 
  CheckCircle2, 
  Film,
  Sparkles
} from 'lucide-react-native';
import tw from 'twrnc';

interface DownloadsScreenProps {
  onClose: () => void;
  onSelectDrama?: (dramaId: string) => void;
}

export default function DownloadsScreen({ onClose, onSelectDrama }: DownloadsScreenProps) {
  const [downloadedEpisodes, setDownloadedEpisodes] = useState<any[]>(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('storyrush_downloads');
        return saved ? JSON.parse(saved) : [];
      }
    } catch {
      return [];
    }
    return [];
  });

  const handleDelete = (id: string, title: string) => {
    Alert.alert(
      "Delete Download",
      `Are you sure you want to remove "${title}" from offline downloads?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => {
            setDownloadedEpisodes(prev => prev.filter(ep => ep.id !== id));
          }
        }
      ]
    );
  };

  const handleClearAll = () => {
    if (downloadedEpisodes.length === 0) return;
    Alert.alert(
      "Clear All Downloads",
      "Remove all offline episodes from your device storage?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear All", 
          style: "destructive",
          onPress: () => setDownloadedEpisodes([])
        }
      ]
    );
  };

  const totalStorageUsed = downloadedEpisodes.length * 40; // ~40MB avg

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
          <Text style={tw`text-sm font-black text-white uppercase tracking-wider`}>Downloads</Text>
          <Text style={tw`text-[10px] text-neutral-400 font-medium`}>Offline Video Storage</Text>
        </View>
        <TouchableOpacity 
          onPress={handleClearAll}
          style={tw`px-2.5 py-1 bg-red-950/40 border border-red-900/50 rounded-lg`}
        >
          <Text style={tw`text-[10px] font-extrabold text-red-500 uppercase`}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`p-4 pb-20`} showsVerticalScrollIndicator={false}>
        {/* Storage Info Card */}
        <View style={tw`bg-neutral-900 border border-neutral-800/80 p-4 rounded-2xl mb-5`}>
          <View style={tw`flex-row items-center justify-between mb-2`}>
            <View style={tw`flex-row items-center gap-2`}>
              <HardDrive size={16} color="#ef4444" />
              <Text style={tw`text-xs font-black text-white uppercase tracking-wider`}>Device Storage</Text>
            </View>
            <Text style={tw`text-[10px] font-extrabold text-neutral-400`}>{totalStorageUsed} MB Used</Text>
          </View>

          {/* Storage Bar */}
          <View style={tw`w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden flex-row mb-2 border border-neutral-800`}>
            <View style={[tw`h-full bg-red-600 rounded-full`, { width: `${Math.max(5, (totalStorageUsed / 32000) * 100)}%` }]} />
          </View>

          <View style={tw`flex-row items-center justify-between`}>
            <Text style={tw`text-[9px] text-neutral-500 font-bold`}>Story Rush Downloads</Text>
            <Text style={tw`text-[9px] text-neutral-500 font-bold`}>32 GB Total Capacity</Text>
          </View>
        </View>

        {/* Downloads List */}
        <View style={tw`mb-4 flex-row items-center justify-between`}>
          <Text style={tw`text-xs font-black text-white uppercase tracking-wider`}>
            Downloaded Episodes ({downloadedEpisodes.length})
          </Text>
          <View style={tw`flex-row items-center gap-1 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800`}>
            <CheckCircle2 size={10} color="#22c55e" />
            <Text style={tw`text-[9px] text-emerald-400 font-bold uppercase`}>Offline Ready</Text>
          </View>
        </View>

        {downloadedEpisodes.length === 0 ? (
          <View style={tw`py-16 items-center bg-neutral-900/40 rounded-3xl border border-neutral-800/60 p-6 text-center`}>
            <Download size={36} color="#525252" style={tw`mb-3`} />
            <Text style={tw`text-xs font-black text-neutral-300 uppercase tracking-wider`}>No Offline Downloads</Text>
            <Text style={tw`text-[10px] text-neutral-500 mt-1 max-w-[240px] text-center leading-relaxed`}>
              You can download your favorite 1-minute drama episodes to watch anytime without using mobile data.
            </Text>
          </View>
        ) : (
          <View style={tw`gap-3`}>
            {downloadedEpisodes.map((ep) => (
              <View 
                key={ep.id}
                style={tw`bg-neutral-900/80 border border-neutral-800/80 p-3 rounded-2xl flex-row items-center gap-3`}
              >
                {/* Thumbnail */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    if (onSelectDrama) {
                      onSelectDrama(ep.dramaId);
                      onClose();
                    }
                  }}
                  style={tw`w-20 h-24 rounded-xl overflow-hidden bg-neutral-950 relative shrink-0 border border-neutral-800`}
                >
                  <Image source={{ uri: ep.thumbnailUrl }} style={tw`w-full h-full`} resizeMode="cover" />
                  <View style={tw`absolute inset-0 bg-black/40 items-center justify-center`}>
                    <View style={tw`w-8 h-8 rounded-full bg-red-600/90 items-center justify-center shadow-lg`}>
                      <Play size={12} color="#ffffff" fill="#ffffff" style={tw`ml-0.5`} />
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Ep Details */}
                <View style={tw`flex-1`}>
                  <Text style={tw`text-amber-400 text-[9px] font-black uppercase tracking-wider mb-0.5`}>
                    {ep.seriesName}
                  </Text>
                  <Text style={tw`text-xs font-black text-white mb-1.5`} numberOfLines={1}>
                    {ep.title}
                  </Text>
                  
                  <View style={tw`flex-row items-center gap-2 mb-1`}>
                    <View style={tw`bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800`}>
                      <Text style={tw`text-[9px] text-neutral-400 font-bold`}>{ep.size}</Text>
                    </View>
                    <View style={tw`bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800`}>
                      <Text style={tw`text-[9px] text-neutral-400 font-bold`}>{ep.quality}</Text>
                    </View>
                  </View>

                  <Text style={tw`text-[9px] text-neutral-500 font-medium`}>Downloaded {ep.date}</Text>
                </View>

                {/* Delete Button */}
                <TouchableOpacity 
                  onPress={() => handleDelete(ep.id, ep.title)}
                  style={tw`w-9 h-9 rounded-xl bg-neutral-950 border border-neutral-800 items-center justify-center`}
                >
                  <Trash2 size={15} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
