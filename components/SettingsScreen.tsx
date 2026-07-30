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
  Switch, 
  Alert 
} from 'react-native';
import { 
  ArrowLeft, 
  Settings as SettingsIcon, 
  Tv, 
  Wifi, 
  Bell, 
  Trash2, 
  ShieldCheck, 
  Check, 
  Smartphone,
  ChevronRight,
  HardDrive
} from 'lucide-react-native';
import tw from 'twrnc';

interface SettingsScreenProps {
  onClose: () => void;
}

export default function SettingsScreen({ onClose }: SettingsScreenProps) {
  const [videoQuality, setVideoQuality] = useState<'auto' | '1080p' | '720p'>('1080p');
  const [autoplayNext, setAutoplayNext] = useState(true);
  const [cellularStreaming, setCellularStreaming] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [recommendations, setRecommendations] = useState(true);
  const [cacheCleared, setCacheCleared] = useState(false);

  const handleClearCache = () => {
    Alert.alert(
      "Clear App Cache",
      "This will release 128 MB of temporary image and video cache. Your account data and watch history will remain safe.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear Cache", 
          style: "default",
          onPress: () => {
            setCacheCleared(true);
            Alert.alert("Cache Cleared", "Successfully freed 128 MB of storage.");
          }
        }
      ]
    );
  };

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
          <Text style={tw`text-sm font-black text-white uppercase tracking-wider`}>Settings</Text>
          <Text style={tw`text-[10px] text-neutral-400 font-medium`}>App & Video Preferences</Text>
        </View>
        <View style={tw`w-9`} />
      </View>

      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`p-4 pb-20`} showsVerticalScrollIndicator={false}>
        {/* Section 1: Playback & Streaming */}
        <View style={tw`mb-6`}>
          <View style={tw`flex-row items-center gap-2 mb-3`}>
            <Tv size={16} color="#ef4444" />
            <Text style={tw`text-xs font-black text-white uppercase tracking-wider`}>Playback & Video Quality</Text>
          </View>

          <View style={tw`bg-neutral-900 rounded-2xl border border-neutral-800/80 overflow-hidden`}>
            {/* Video Quality selection */}
            <View style={tw`p-4 border-b border-neutral-800/60`}>
              <Text style={tw`text-xs font-bold text-neutral-200 mb-2.5`}>Default Streaming Quality</Text>
              <View style={tw`flex-row gap-2`}>
                {[
                  { id: '1080p', label: '1080p Full HD' },
                  { id: '720p', label: '720p Data Saver' },
                  { id: 'auto', label: 'Auto Speed' }
                ].map((q) => {
                  const isActive = videoQuality === q.id;
                  return (
                    <TouchableOpacity
                      key={q.id}
                      onPress={() => setVideoQuality(q.id as any)}
                      style={tw`flex-1 py-2 px-2.5 rounded-xl border items-center justify-center ${
                        isActive 
                          ? 'bg-red-600 border-red-500' 
                          : 'bg-neutral-950 border-neutral-800'
                      }`}
                    >
                      <Text style={tw`text-[10px] font-black ${isActive ? 'text-white' : 'text-neutral-400'}`}>
                        {q.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Autoplay Next Episode */}
            <View style={tw`flex-row items-center justify-between p-4 border-b border-neutral-800/60`}>
              <View style={tw`flex-1 pr-3`}>
                <Text style={tw`text-xs font-bold text-neutral-200`}>Autoplay Next Episode</Text>
                <Text style={tw`text-[10px] text-neutral-500 mt-0.5`}>Automatically play Episode +1 when current episode ends</Text>
              </View>
              <Switch 
                value={autoplayNext} 
                onValueChange={setAutoplayNext} 
                trackColor={{ false: '#262626', true: '#dc2626' }}
                thumbColor="#ffffff"
              />
            </View>

            {/* Cellular Streaming */}
            <View style={tw`flex-row items-center justify-between p-4`}>
              <View style={tw`flex-1 pr-3`}>
                <Text style={tw`text-xs font-bold text-neutral-200`}>Cellular Data Streaming</Text>
                <Text style={tw`text-[10px] text-neutral-500 mt-0.5`}>Allow video playback on 4G/5G mobile data networks</Text>
              </View>
              <Switch 
                value={cellularStreaming} 
                onValueChange={setCellularStreaming} 
                trackColor={{ false: '#262626', true: '#dc2626' }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </View>

        {/* Section 2: Notifications */}
        <View style={tw`mb-6`}>
          <View style={tw`flex-row items-center gap-2 mb-3`}>
            <Bell size={16} color="#ef4444" />
            <Text style={tw`text-xs font-black text-white uppercase tracking-wider`}>Notifications</Text>
          </View>

          <View style={tw`bg-neutral-900 rounded-2xl border border-neutral-800/80 overflow-hidden`}>
            {/* New Episode Alerts */}
            <View style={tw`flex-row items-center justify-between p-4 border-b border-neutral-800/60`}>
              <View style={tw`flex-1 pr-3`}>
                <Text style={tw`text-xs font-bold text-neutral-200`}>New Episode Drops</Text>
                <Text style={tw`text-[10px] text-neutral-500 mt-0.5`}>Get notified when new episodes of your followed series premiere</Text>
              </View>
              <Switch 
                value={pushNotifications} 
                onValueChange={setPushNotifications} 
                trackColor={{ false: '#262626', true: '#dc2626' }}
                thumbColor="#ffffff"
              />
            </View>

            {/* Daily Drama Recommendations */}
            <View style={tw`flex-row items-center justify-between p-4`}>
              <View style={tw`flex-1 pr-3`}>
                <Text style={tw`text-xs font-bold text-neutral-200`}>Daily Recommendations</Text>
                <Text style={tw`text-[10px] text-neutral-500 mt-0.5`}>Receive personalized 1-minute drama picks every morning</Text>
              </View>
              <Switch 
                value={recommendations} 
                onValueChange={setRecommendations} 
                trackColor={{ false: '#262626', true: '#dc2626' }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </View>

        {/* Section 3: Storage & Cache */}
        <View style={tw`mb-6`}>
          <View style={tw`flex-row items-center gap-2 mb-3`}>
            <HardDrive size={16} color="#ef4444" />
            <Text style={tw`text-xs font-black text-white uppercase tracking-wider`}>Storage & Cache</Text>
          </View>

          <View style={tw`bg-neutral-900 rounded-2xl border border-neutral-800/80 p-4 flex-row items-center justify-between`}>
            <View>
              <Text style={tw`text-xs font-bold text-neutral-200`}>Temporary Video Cache</Text>
              <Text style={tw`text-[10px] text-neutral-500 mt-0.5`}>
                {cacheCleared ? '0 MB used' : '128.4 MB temporary image/video cache'}
              </Text>
            </View>

            <TouchableOpacity 
              onPress={handleClearCache}
              style={tw`px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl flex-row items-center gap-1.5`}
            >
              <Trash2 size={13} color="#ef4444" />
              <Text style={tw`text-[10px] font-extrabold text-red-500 uppercase`}>Clear Cache</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 4: Security & Environment */}
        <View style={tw`mb-6`}>
          <View style={tw`flex-row items-center gap-2 mb-3`}>
            <ShieldCheck size={16} color="#ef4444" />
            <Text style={tw`text-xs font-black text-white uppercase tracking-wider`}>Security & Payments</Text>
          </View>

          <View style={tw`bg-neutral-900 rounded-2xl border border-neutral-800/80 p-4 gap-2.5`}>
            <View style={tw`flex-row items-center justify-between`}>
              <Text style={tw`text-xs font-bold text-neutral-300`}>Payment Gateway</Text>
              <Text style={tw`text-xs font-black text-emerald-400`}>Cashfree Encrypted</Text>
            </View>
            <View style={tw`flex-row items-center justify-between`}>
              <Text style={tw`text-xs font-bold text-neutral-300`}>Database Protection</Text>
              <Text style={tw`text-xs font-black text-emerald-400`}>Firebase Auth Rules</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
