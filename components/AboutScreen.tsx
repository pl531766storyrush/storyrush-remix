/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  Linking 
} from 'react-native';
import { 
  ArrowLeft, 
  Tv, 
  Award, 
  Zap, 
  ShieldCheck, 
  Globe, 
  Heart, 
  ChevronRight, 
  Sparkles,
  Film
} from 'lucide-react-native';
import tw from 'twrnc';

interface AboutScreenProps {
  onClose: () => void;
  onOpenLegal?: (page: 'privacy' | 'terms' | 'contact') => void;
}

export default function AboutScreen({ onClose, onOpenLegal }: AboutScreenProps) {
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
          <Text style={tw`text-sm font-black text-white uppercase tracking-wider`}>About Us</Text>
          <Text style={tw`text-[10px] text-neutral-400 font-medium`}>Platform & Brand Story</Text>
        </View>
        <View style={tw`w-9`} />
      </View>

      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`p-4 pb-20`} showsVerticalScrollIndicator={false}>
        {/* App Branding Hero Banner */}
        <View style={tw`bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 p-6 rounded-3xl items-center text-center mb-6 relative overflow-hidden shadow-2xl`}>
          <View style={tw`w-16 h-16 rounded-2xl bg-red-600 items-center justify-center shadow-2xl mb-3 border border-red-400`}>
            <Tv size={32} color="#ffffff" />
          </View>

          <View style={tw`flex-row items-center gap-1.5 mb-1`}>
            <Text style={tw`text-2xl font-black text-red-600 tracking-wider`}>STORY</Text>
            <Text style={tw`text-2xl font-black text-white tracking-wider`}>RUSH</Text>
          </View>
          <Text style={tw`text-[10px] text-neutral-400 font-black uppercase tracking-widest mb-3`}>Next-Gen Short Drama Network</Text>

          <View style={tw`bg-neutral-800/80 px-3 py-1 rounded-full border border-neutral-700/80`}>
            <Text style={tw`text-[10px] text-amber-400 font-extrabold uppercase`}>Version 1.2.0 (Build 2026.07)</Text>
          </View>
        </View>

        {/* Mission Statement */}
        <View style={tw`bg-neutral-900 border border-neutral-800/80 p-5 rounded-2xl mb-6`}>
          <Text style={tw`text-xs font-black text-white uppercase tracking-wider mb-2`}>
            Our Mission
          </Text>
          <Text style={tw`text-neutral-300 text-xs leading-relaxed`}>
            Story Rush is a premier short drama streaming destination bringing high-octane 1-minute bingeable episodes, romantic blockbusters, and thriller sagas directly to mobile viewers worldwide.
          </Text>
          <Text style={tw`text-neutral-400 text-xs leading-relaxed mt-2`}>
            Every episode is crafted for vertical viewing with cliffhangers that leave you on the edge of your seat.
          </Text>
        </View>

        {/* Key Features */}
        <View style={tw`mb-6`}>
          <Text style={tw`text-xs font-black text-white uppercase tracking-wider mb-3 px-1`}>
            Why Viewers Love Story Rush
          </Text>

          <View style={tw`gap-3`}>
            <View style={tw`bg-neutral-900 border border-neutral-800/80 p-4 rounded-2xl flex-row items-center gap-3.5`}>
              <View style={tw`w-10 h-10 rounded-xl bg-red-950/60 border border-red-900/50 items-center justify-center shrink-0`}>
                <Zap size={20} color="#ef4444" />
              </View>
              <View style={tw`flex-1`}>
                <Text style={tw`text-xs font-black text-white`}>1-Minute Lightning Episodes</Text>
                <Text style={tw`text-[10px] text-neutral-400 mt-0.5`}>Snackable drama clips designed for instant gratification on the go.</Text>
              </View>
            </View>

            <View style={tw`bg-neutral-900 border border-neutral-800/80 p-4 rounded-2xl flex-row items-center gap-3.5`}>
              <View style={tw`w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-900/50 items-center justify-center shrink-0`}>
                <Sparkles size={20} color="#f59e0b" />
              </View>
              <View style={tw`flex-1`}>
                <Text style={tw`text-xs font-black text-white`}>Exclusive Blockbuster Series</Text>
                <Text style={tw`text-[10px] text-neutral-400 mt-0.5`}>Original CEO sagas, ninja revenge stories, and suspense thrillers.</Text>
              </View>
            </View>

            <View style={tw`bg-neutral-900 border border-neutral-800/80 p-4 rounded-2xl flex-row items-center gap-3.5`}>
              <View style={tw`w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-900/50 items-center justify-center shrink-0`}>
                <ShieldCheck size={20} color="#10b981" />
              </View>
              <View style={tw`flex-1`}>
                <Text style={tw`text-xs font-black text-white`}>Cashfree Instant VIP Passes</Text>
                <Text style={tw`text-[10px] text-neutral-400 mt-0.5`}>Bank-grade secure UPI and card checkouts for instant premium access.</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Legal & Contact Links */}
        <View style={tw`bg-neutral-900 border border-neutral-800/80 rounded-2xl overflow-hidden mb-6`}>
          <TouchableOpacity 
            onPress={() => onOpenLegal ? onOpenLegal('privacy') : null}
            style={tw`p-4 flex-row items-center justify-between border-b border-neutral-800/60`}
          >
            <Text style={tw`text-xs font-bold text-neutral-200`}>Privacy Policy</Text>
            <ChevronRight size={14} color="#525252" />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => onOpenLegal ? onOpenLegal('terms') : null}
            style={tw`p-4 flex-row items-center justify-between border-b border-neutral-800/60`}
          >
            <Text style={tw`text-xs font-bold text-neutral-200`}>Terms of Service</Text>
            <ChevronRight size={14} color="#525252" />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => onOpenLegal ? onOpenLegal('contact') : null}
            style={tw`p-4 flex-row items-center justify-between`}
          >
            <Text style={tw`text-xs font-bold text-neutral-200`}>Customer Support</Text>
            <ChevronRight size={14} color="#525252" />
          </TouchableOpacity>
        </View>

        {/* Copyright Footer */}
        <View style={tw`items-center py-2`}>
          <Text style={tw`text-[10px] text-neutral-500 font-bold uppercase tracking-wider text-center`}>
            © 2026 Story Rush Inc. All Rights Reserved.
          </Text>
          <Text style={tw`text-[9px] text-neutral-600 mt-1`}>Made with passion for short drama fans everywhere.</Text>
        </View>
      </ScrollView>
    </View>
  );
}
