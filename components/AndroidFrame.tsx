/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Platform, useWindowDimensions } from 'react-native';
import { Battery, Wifi, Signal } from 'lucide-react-native';
import tw from 'twrnc';

interface AndroidFrameProps {
  children: React.ReactNode;
}

export default function AndroidFrame({ children }: AndroidFrameProps) {
  const [time, setTime] = useState('');
  const { width } = useWindowDimensions();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setTime(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isWeb = Platform.OS === 'web';
  const showMockFrame = isWeb && width > 480;

  if (!showMockFrame) {
    // On native devices or small screens, just render the content directly with a status bar space
    return (
      <View style={tw`flex-1 bg-black`}>
        {/* Status Bar Spacer */}
        <View style={tw`h-8 bg-black/90 px-4 flex-row items-center justify-between`}>
          <Text style={tw`text-neutral-400 text-xs font-semibold`}>{time}</Text>
          <View style={tw`flex-row items-center`}>
            <Signal size={12} color="#a3a3a3" style={tw`mr-1`} />
            <Wifi size={12} color="#a3a3a3" style={tw`mr-1`} />
            <Text style={tw`text-neutral-400 text-[10px] mr-1`}>85%</Text>
            <Battery size={14} color="#ef4444" />
          </View>
        </View>
        <View style={tw`flex-1`}>
          {children}
        </View>
      </View>
    );
  }

  return (
    /* Device container */
    <View style={tw`relative w-full h-full bg-black rounded-[48px] overflow-hidden flex flex-col border border-neutral-800 shadow-2xl`}>
      
      {/* Android Hardware Camera/Island Hole */}
      <View style={tw`absolute top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-full z-50 flex-row items-center justify-center border border-neutral-800/20`}>
        <View style={tw`w-3 h-3 bg-[#0d0d12] rounded-full border border-neutral-800/40 mr-2`} />
        <View style={tw`w-1.5 h-1.5 bg-[#14141d] rounded-full`} />
      </View>

      {/* Android Status Bar */}
      <View style={tw`h-10 bg-black/90 px-6 pt-2 flex-row items-center justify-between z-40`}>
        <Text style={tw`text-xs font-semibold text-neutral-400`}>{time}</Text>
        <View style={tw`flex-row items-center`}>
          <Signal size={14} color="#a3a3a3" style={tw`mr-1.5`} />
          <Wifi size={14} color="#a3a3a3" style={tw`mr-1.5`} />
          <View style={tw`flex-row items-center`}>
            <Text style={tw`text-[10px] text-neutral-400 mr-1`}>85%</Text>
            <Battery size={16} color="#ef4444" />
          </View>
        </View>
      </View>

      {/* Dynamic Screen Content Panel */}
      <View style={tw`flex-1 relative overflow-hidden bg-black`}>
        {children}
      </View>

      {/* Android Bottom Navigation Indicator Bar */}
      <View style={tw`h-6 bg-black px-6 pb-2 flex-row items-center justify-center z-40`}>
        <View style={tw`w-36 h-1 bg-neutral-700 rounded-full`} />
      </View>

      {/* Smartphone Side Buttons Decoration */}
      <View style={tw`absolute top-28 -left-1 w-[3px] h-12 bg-neutral-700 rounded-r-lg`} />
      <View style={tw`absolute top-44 -left-1 w-[3px] h-16 bg-neutral-700 rounded-r-lg`} />
      <View style={tw`absolute top-64 -left-1 w-[3px] h-16 bg-neutral-700 rounded-r-lg`} />
      <View style={tw`absolute top-36 -right-1 w-[3px] h-20 bg-neutral-700 rounded-l-lg`} />
    </View>
  );
}
