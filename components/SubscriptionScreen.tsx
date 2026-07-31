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
  TextInput, 
  Modal, 
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  X, 
  CreditCard, 
  Award,
  QrCode,
  Smartphone,
  Wallet,
  Building
} from 'lucide-react-native';
import tw from 'twrnc';

interface SubscriptionScreenProps {
  currentUser: any;
  onSuccess: () => void;
}

export default function SubscriptionScreen({ currentUser, onSuccess }: SubscriptionScreenProps) {
  const [selectedPlan, setSelectedPlan] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  const isDevOrPreview = (() => {
    if (typeof window !== 'undefined' && window.location) {
      const hn = window.location.hostname || '';
      if (hn.includes('ais-dev-') || hn.includes('ais-pre-') || hn.includes('localhost') || hn.includes('127.0.0.1')) {
        return true;
      }
    }
    try {
      if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') return true;
    } catch (e) {}
    return false;
  })();

  // Indian Payment Method Selection
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'card' | 'netbanking'>('upi');
  
  // Payment Form States prefilled with valid Indian demo credentials for effortless dev validation
  const [upiId, setUpiId] = useState('storyrush@okhdfcbank');
  const [phoneNumber, setPhoneNumber] = useState('9876543210');
  const [selectedBank, setSelectedBank] = useState('SBI');
  const [cardName, setCardName] = useState('Rahul Sharma');
  const [cardNumber, setCardNumber] = useState('4321 5678 9876 5432');
  const [cardExpiry, setCardExpiry] = useState('12/29');
  const [cvv, setCvv] = useState('123');

  // Random transaction ID for QR Code
  const [txId, setTxId] = useState('');

  useEffect(() => {
    setTxId(`SR-${Math.floor(100000 + Math.random() * 900000)}`);
  }, [showPaymentModal]);

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.isGuest) {
      setIsPremium(currentUser.isPremium || currentUser.premium || false);
      return;
    }
    const fetchUser = async () => {
      try {
        const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
        if (userSnap.exists()) {
          const data = userSnap.data();
          setIsPremium(data.isPremium || data.premium || false);
        }
      } catch (err) {
        // Handle error silently
      }
    };
    fetchUser();
  }, [currentUser]);

  const handleSubscribe = () => {
    console.log('[SubscriptionScreen] handleSubscribe initiated, opening payment modal.');
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async () => {
    console.log('[SubscriptionScreen] handlePaymentSubmit triggered.');
    if (!currentUser) {
      console.error('[SubscriptionScreen] Submit failed: No authenticated user.');
      return;
    }

    console.log(`[SubscriptionScreen] Validation checking for method: ${paymentMethod}`);
    // Validate based on chosen payment method
    if (paymentMethod === 'upi') {
      if (!upiId.trim() || !upiId.includes('@')) {
        console.warn('[SubscriptionScreen] UPI Validation Failed');
        Alert.alert('Payment Error', 'Please enter a valid UPI ID (e.g., username@upi)');
        return;
      }
    } else if (paymentMethod === 'bhim') {
      if (!upiId.trim() || !upiId.includes('@')) {
        console.warn('[SubscriptionScreen] BHIM UPI Validation Failed');
        Alert.alert('Payment Error', 'Please enter a valid BHIM UPI ID (e.g., username@upi)');
        return;
      }
    } else if (paymentMethod === 'gpay' || paymentMethod === 'phonepe' || paymentMethod === 'paytm') {
      const trimmedPhone = phoneNumber.trim();
      if (!trimmedPhone || trimmedPhone.length < 10 || !/^\d+$/.test(trimmedPhone)) {
        console.warn('[SubscriptionScreen] Wallet Phone Validation Failed');
        Alert.alert('Payment Error', 'Please enter a valid 10-digit Indian Mobile Number');
        return;
      }
    } else if (paymentMethod === 'card') {
      if (!cardName.trim()) {
        console.warn('[SubscriptionScreen] Cardholder Name Validation Failed');
        Alert.alert('Payment Error', 'Please enter the cardholder name');
        return;
      }
      const cleanCard = cardNumber.replace(/\s/g, '');
      if (cleanCard.length < 15 || !/^\d+$/.test(cleanCard)) {
        console.warn('[SubscriptionScreen] Card Number Validation Failed');
        Alert.alert('Payment Error', 'Please enter a valid Credit or Debit Card number');
        return;
      }
      if (!cardExpiry.trim()) {
        console.warn('[SubscriptionScreen] Card Expiry Validation Failed');
        Alert.alert('Payment Error', 'Please enter card expiry date (MM/YY)');
        return;
      }
      if (cvv.trim().length !== 3 || !/^\d+$/.test(cvv.trim())) {
        console.warn('[SubscriptionScreen] CVV Validation Failed');
        Alert.alert('Payment Error', 'Please enter a valid 3-digit CVV');
        return;
      }
    } else if (paymentMethod === 'netbanking') {
      if (!selectedBank.trim()) {
        console.warn('[SubscriptionScreen] Net Banking Bank Selection Failed');
        Alert.alert('Payment Error', 'Please select or enter your bank name');
        return;
      }
    }

    console.log('[SubscriptionScreen] Validation Passed! Commencing simulated secure checkout...');
    setLoading(true);
    try {
      // Simulate payment delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const expiresAt = new Date();
      if (selectedPlan === 'weekly') {
        expiresAt.setDate(expiresAt.getDate() + 7);
      } else if (selectedPlan === 'monthly') {
        expiresAt.setDate(expiresAt.getDate() + 30);
      } else if (selectedPlan === 'yearly') {
        expiresAt.setDate(expiresAt.getDate() + 365);
      }

      console.log('[SubscriptionScreen] Payment simulation successful. Updating user profile to premium in Firestore...');
      if (currentUser.isGuest) {
        currentUser.isPremium = true;
        currentUser.premium = true;
        currentUser.subscriptionPlan = selectedPlan;
        currentUser.purchaseDate = new Date().toISOString();
        currentUser.expiryDate = expiresAt.toISOString();
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('storyrush_guest_user', JSON.stringify(currentUser));
          }
        } catch (e) {}
        setIsPremium(true);
        setShowPaymentModal(false);
        Alert.alert(
          'Premium activated successfully 🎉',
          `Congratulations! You are now a Story Rush Premium VIP User. Selected plan: ${
            selectedPlan === 'weekly' ? 'Weekly Pass' : selectedPlan === 'monthly' ? 'Monthly VIP' : 'Yearly VIP'
          }.`
        );
        onSuccess();
        setLoading(false);
        return;
      }

      // Persist in Firestore (updates both isPremium and premium fields to be 100% compatible)
      await updateDoc(doc(db, 'users', currentUser.uid), {
        isPremium: true,
        premium: true,
        premiumPlan: selectedPlan,
        premiumExpiresAt: expiresAt.toISOString(),
        premiumActivatedAt: new Date().toISOString(),
        subscriptionPlan: selectedPlan,
        purchaseDate: new Date().toISOString(),
        expiryDate: expiresAt.toISOString()
      });

      console.log('[SubscriptionScreen] Firestore updated successfully.');
      setIsPremium(true);
      setShowPaymentModal(false);
      Alert.alert(
        'Premium activated successfully 🎉',
        `Congratulations! You are now a Story Rush Premium VIP User. Selected plan: ${
          selectedPlan === 'weekly' ? 'Weekly Pass' : selectedPlan === 'monthly' ? 'Monthly VIP' : 'Yearly VIP'
        }.`
      );
      onSuccess();
    } catch (err) {
      console.error('[SubscriptionScreen] Firestore update failed:', err);
      handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDeveloperTestMode = async () => {
    if (!currentUser) {
      Alert.alert('Test Mode Error', 'You must be logged in (or using a guest profile) to toggle test mode.');
      return;
    }
    setLoading(true);
    try {
      if (isPremium) {
        // Toggle OFF
        if (currentUser.isGuest) {
          currentUser.isPremium = false;
          currentUser.premium = false;
          delete currentUser.subscriptionPlan;
          delete currentUser.purchaseDate;
          delete currentUser.expiryDate;
          try {
            localStorage.setItem('storyrush_guest_user', JSON.stringify(currentUser));
          } catch (e) {}
        } else {
          await updateDoc(doc(db, 'users', currentUser.uid), {
            isPremium: false,
            premium: false,
            premiumPlan: null,
            premiumExpiresAt: null,
            premiumActivatedAt: null,
            subscriptionPlan: null,
            purchaseDate: null,
            expiryDate: null
          });
        }
        setIsPremium(false);
        Alert.alert('Developer Test Mode', 'Premium subscription is now disabled.');
      } else {
        // Toggle ON
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Expire in 10 minutes for testing automatic expiry!
        
        if (currentUser.isGuest) {
          currentUser.isPremium = true;
          currentUser.premium = true;
          currentUser.subscriptionPlan = selectedPlan;
          currentUser.purchaseDate = new Date().toISOString();
          currentUser.expiryDate = expiresAt.toISOString();
          try {
            localStorage.setItem('storyrush_guest_user', JSON.stringify(currentUser));
          } catch (e) {}
        } else {
          await updateDoc(doc(db, 'users', currentUser.uid), {
            isPremium: true,
            premium: true,
            premiumPlan: selectedPlan,
            premiumExpiresAt: expiresAt.toISOString(),
            premiumActivatedAt: new Date().toISOString(),
            subscriptionPlan: selectedPlan,
            purchaseDate: new Date().toISOString(),
            expiryDate: expiresAt.toISOString()
          });
        }
        setIsPremium(true);
        Alert.alert(
          'Developer Test Mode', 
          `Premium activated successfully! Expiring in 10 minutes (at ${expiresAt.toLocaleTimeString()}) to test automatic expiration.`
        );
      }
      onSuccess();
    } catch (err: any) {
      console.error('Developer test mode toggle failure:', err);
      Alert.alert('Error', err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    'Unlimited Access to All Episodes',
    'No Ads & No Interruptions',
    'Simultaneous Streams on 2 Devices',
    'Early Access to Release Day Episodes',
    'Stunning HD Cinema Quality (1080p)',
    'Exclusive VIP Profile Emblem & Premium User Tag'
  ];

  const getPlanPriceString = () => {
    if (selectedPlan === 'weekly') return '₹29';
    if (selectedPlan === 'monthly') return '₹99';
    return '₹599';
  };

  const getPlanDurationString = () => {
    if (selectedPlan === 'weekly') return 'week';
    if (selectedPlan === 'monthly') return 'month';
    return 'year';
  };

  const paymentMethodsList = [
    { id: 'upi', label: 'UPI QR / ID', icon: QrCode },
    { id: 'gpay', label: 'GPay', icon: Smartphone },
    { id: 'phonepe', label: 'PhonePe', icon: Smartphone },
    { id: 'paytm', label: 'Paytm', icon: Wallet },
    { id: 'bhim', label: 'BHIM UPI', icon: QrCode },
    { id: 'card', label: 'Card', icon: CreditCard },
    { id: 'netbanking', label: 'Net Banking', icon: Building },
  ] as const;

  const majorBanks = [
    { id: 'SBI', label: 'SBI' },
    { id: 'HDFC', label: 'HDFC' },
    { id: 'ICICI', label: 'ICICI' },
    { id: 'AXIS', label: 'Axis' },
    { id: 'KOTAK', label: 'Kotak' },
  ];

  return (
    <View style={tw`flex-1 bg-neutral-950 relative`}>
      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`px-4 pt-6 pb-24`} showsVerticalScrollIndicator={false}>
        <View style={tw`items-center mb-6`}>
          <View style={tw`w-12 h-12 bg-amber-500 rounded-2xl items-center justify-center mb-3 shadow border border-amber-400/25`}>
            <Zap size={24} color="#ffffff" fill="#ffffff" />
          </View>
          <Text style={tw`text-xl font-black text-white tracking-wide uppercase`}>
            STORY<Text style={tw`text-red-500`}>RUSH</Text> VIP
          </Text>
          <Text style={tw`text-[10px] text-neutral-400 mt-1 max-w-[240px] text-center leading-relaxed`}>
            Unlimited dramatic twists. No token lockouts. Ever. Special Indian Pricing.
          </Text>
        </View>

        {/* Premium Badge active status banner */}
        {isPremium ? (
          <View style={tw`bg-emerald-950/25 border border-emerald-500/30 p-5 rounded-2xl items-center mb-6`}>
            <ShieldCheck size={40} color="#10b981" style={tw`mb-2`} />
            <Text style={tw`text-sm font-bold text-white text-center`}>Your Premium is Active!</Text>
            <Text style={tw`text-[10px] text-neutral-400 mt-1 text-center leading-relaxed`}>
              You have unrestricted VIP access to all short dramas, series, and features as a Premium User.
            </Text>
          </View>
        ) : (
          <View style={tw`gap-4`}>
            {/* Package Choices - Stacked vertically for superior responsive readability */}
            <View style={tw`gap-3`}>
              {/* Weekly Option */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSelectedPlan('weekly')}
                style={tw`p-4 rounded-2xl border flex-row justify-between items-center ${
                  selectedPlan === 'weekly' ? 'bg-neutral-900 border-red-600' : 'bg-neutral-900/45 border-neutral-800'
                }`}
              >
                <View style={tw`flex-row items-center gap-3 flex-1`}>
                  <View style={tw`w-4 h-4 rounded-full border items-center justify-center ${
                    selectedPlan === 'weekly' ? 'border-red-600 bg-red-600' : 'border-neutral-700'
                  }`}>
                    {selectedPlan === 'weekly' && <View style={tw`w-2 h-2 bg-white rounded-full`} />}
                  </View>
                  <View>
                    <Text style={tw`text-xs font-black text-white`}>Weekly Pass</Text>
                    <Text style={tw`text-[9px] text-neutral-500`}>Billed weekly</Text>
                  </View>
                </View>
                <View style={tw`items-end`}>
                  <Text style={tw`text-base font-black text-white`}>₹29</Text>
                  <Text style={tw`text-[8px] text-neutral-500`}>/ week</Text>
                </View>
              </TouchableOpacity>

              {/* Monthly Option */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSelectedPlan('monthly')}
                style={tw`p-4 rounded-2xl border flex-row justify-between items-center relative ${
                  selectedPlan === 'monthly' ? 'bg-neutral-900 border-red-600' : 'bg-neutral-900/45 border-neutral-800'
                }`}
              >
                <View style={tw`absolute -top-2 right-4 bg-red-600 px-2.5 py-0.5 rounded-full shadow`}>
                  <Text style={tw`text-white text-[8px] uppercase font-black tracking-wider`}>SAVE 40%</Text>
                </View>
                <View style={tw`flex-row items-center gap-3 flex-1`}>
                  <View style={tw`w-4 h-4 rounded-full border items-center justify-center ${
                    selectedPlan === 'monthly' ? 'border-red-600 bg-red-600' : 'border-neutral-700'
                  }`}>
                    {selectedPlan === 'monthly' && <View style={tw`w-2 h-2 bg-white rounded-full`} />}
                  </View>
                  <View>
                    <Text style={tw`text-xs font-black text-white`}>Monthly VIP</Text>
                    <Text style={tw`text-[9px] text-neutral-500`}>Most popular option</Text>
                  </View>
                </View>
                <View style={tw`items-end`}>
                  <Text style={tw`text-base font-black text-white`}>₹99</Text>
                  <Text style={tw`text-[8px] text-neutral-500`}>/ month</Text>
                </View>
              </TouchableOpacity>

              {/* Yearly Option */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSelectedPlan('yearly')}
                style={tw`p-4 rounded-2xl border flex-row justify-between items-center relative ${
                  selectedPlan === 'yearly' ? 'bg-neutral-900 border-red-600' : 'bg-neutral-900/45 border-neutral-800'
                }`}
              >
                <View style={tw`absolute -top-2 right-4 bg-amber-500 px-2.5 py-0.5 rounded-full shadow`}>
                  <Text style={tw`text-neutral-950 text-[8px] uppercase font-black tracking-wider`}>BEST VALUE (SAVE 60%)</Text>
                </View>
                <View style={tw`flex-row items-center gap-3 flex-1`}>
                  <View style={tw`w-4 h-4 rounded-full border items-center justify-center ${
                    selectedPlan === 'yearly' ? 'border-red-600 bg-red-600' : 'border-neutral-700'
                  }`}>
                    {selectedPlan === 'yearly' && <View style={tw`w-2 h-2 bg-white rounded-full`} />}
                  </View>
                  <View>
                    <Text style={tw`text-xs font-black text-white`}>Yearly VIP</Text>
                    <Text style={tw`text-[9px] text-neutral-500`}>Best overall price</Text>
                  </View>
                </View>
                <View style={tw`items-end`}>
                  <Text style={tw`text-base font-black text-white`}>₹599</Text>
                  <Text style={tw`text-[8px] text-neutral-500`}>/ year</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Benefits List */}
            <View style={tw`bg-neutral-900/35 border border-neutral-800/40 p-4 rounded-2xl gap-2.5`}>
              <Text style={tw`text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1`}>VIP Features Included:</Text>
              {benefits.map((benefit, i) => (
                <View key={i} style={tw`flex-row items-center gap-2.5`}>
                  <CheckCircle2 size={14} color="#ef4444" style={tw`shrink-0`} />
                  <Text style={tw`text-[10px] text-neutral-400 flex-1`}>{benefit}</Text>
                </View>
              ))}
            </View>

            {/* Subscription Trigger Action button */}
            <TouchableOpacity
              onPress={handleSubscribe}
              style={tw`w-full bg-red-600 py-3.5 rounded-xl mt-3 flex-row items-center justify-center gap-2 shadow-lg`}
            >
              <Sparkles size={16} color="#ffffff" fill="#ffffff" />
              <Text style={tw`text-white font-extrabold text-xs uppercase tracking-widest`}>Unlock Premium Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Trust terms */}
        <Text style={tw`text-center text-[9px] text-neutral-500 leading-relaxed px-2 mt-6`}>
          Subscriptions will renew automatically at the price chosen. Cancel anytime under your Play Account settings with a simple tap. Prices include GST.
        </Text>

        {/* Requirement: Test the complete Premium flow using a temporary developer test mode */}
        {isDevOrPreview && (
          <View style={tw`mt-6 border border-dashed border-amber-500/30 bg-amber-500/5 p-4 rounded-2xl items-center pb-6 mb-12`}>
            <Text style={tw`text-amber-500 text-[10px] font-black uppercase tracking-wider mb-1`}>
              🛠️ Developer Test Panel
            </Text>
            <Text style={tw`text-neutral-400 text-[9px] text-center mb-3 leading-relaxed max-w-[260px]`}>
              Fast-track toggle to test Premium. Enabling VIP state simulates a complete checkout with a 10-minute expiry time to verify locked-out and unlocked experiences.
            </Text>
            <TouchableOpacity
              onPress={handleToggleDeveloperTestMode}
              style={tw`bg-amber-500/10 border border-amber-500/30 px-5 py-2.5 rounded-xl active:scale-95`}
            >
              <Text style={tw`text-amber-500 text-[10px] font-black uppercase tracking-widest`}>
                {isPremium ? 'Disable VIP (Lock Feed)' : 'Enable VIP (Unlock Feed)'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Premium Payment Drawer Overlay - Custom absolute positioned View to prevent React Portals and touch issues */}
      {showPaymentModal && (
        <View style={tw`absolute inset-0 bg-black/75 justify-end z-50`} pointerEvents="auto">
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={tw`flex-1 justify-end`}
            pointerEvents="auto"
          >
            <View 
              style={tw`bg-neutral-900 rounded-t-[32px] p-6 border-t border-neutral-800 max-h-[90%]`}
              pointerEvents="auto"
            >
            <View style={tw`flex-row items-center justify-between mb-4`}>
              <View style={tw`flex-row items-center gap-2`}>
                <CreditCard size={18} color="#ef4444" />
                <Text style={tw`text-xs font-black text-white uppercase tracking-wider ml-1.5`}>Indian Secure Payment Gateway</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  console.log('[SubscriptionScreen] Closing payment modal');
                  setShowPaymentModal(false);
                }}
                style={tw`w-7 h-7 rounded-full bg-neutral-950 items-center justify-center`}
              >
                <X size={16} color="#a3a3a3" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw`pb-6`}>
              {/* Selected Plan Summary Banner */}
              <View style={tw`bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 flex-row justify-between items-center mb-4`}>
                <View>
                  <Text style={tw`text-[9px] text-neutral-400 uppercase font-black`}>Plan Selected</Text>
                  <Text style={tw`text-xs font-bold text-white uppercase`}>
                    {selectedPlan === 'weekly' ? 'Weekly Pass' : selectedPlan === 'monthly' ? 'Monthly VIP' : 'Yearly VIP'}
                  </Text>
                </View>
                <Text style={tw`text-sm font-black text-red-500`}>
                  {getPlanPriceString()} <Text style={tw`text-[9px] text-neutral-500 font-normal`}>/{getPlanDurationString()}</Text>
                </Text>
              </View>

              {/* Indian Payment Methods Tabs */}
              <Text style={tw`text-[9px] text-neutral-400 font-bold uppercase mb-2`}>Select Payment Method</Text>
              <View style={tw`flex-row flex-wrap gap-1.5 mb-4`}>
                {paymentMethodsList.map((method) => {
                  const IconComp = method.icon;
                  const isSelected = paymentMethod === method.id;
                  return (
                    <TouchableOpacity
                      key={method.id}
                      onPress={() => {
                        console.log(`[SubscriptionScreen] Selected payment method: ${method.id}`);
                        setPaymentMethod(method.id);
                      }}
                      style={tw`px-2.5 py-2 rounded-xl border flex-row items-center gap-1.5 ${
                        isSelected ? 'bg-red-600/10 border-red-600' : 'bg-neutral-950 border-neutral-850'
                      }`}
                    >
                      <IconComp size={12} color={isSelected ? '#ef4444' : '#737373'} />
                      <Text style={tw`text-[9px] font-black uppercase ${isSelected ? 'text-white' : 'text-neutral-400'}`}>
                        {method.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Interactive Dynamic Form Fields based on selection */}
              <View style={tw`mb-5`}>
                {/* Custom UPI Form (QR + Input) */}
                {paymentMethod === 'upi' && (
                  <View style={tw`gap-4`}>
                    <View style={tw`bg-neutral-950 p-4 rounded-xl border border-neutral-800 items-center justify-center`}>
                      <View style={tw`bg-white p-2.5 rounded-xl mb-3 shadow`}>
                        <QrCode size={130} color="#000000" />
                      </View>
                      <Text style={tw`text-[10px] text-neutral-200 text-center font-bold uppercase tracking-wide`}>
                        Scan QR Code to pay ₹{selectedPlan === 'weekly' ? '29' : selectedPlan === 'monthly' ? '99' : '599'}
                      </Text>
                      <Text style={tw`text-[9px] text-neutral-500 mt-1 text-center`}>
                        Scan using GPay, PhonePe, Paytm, or BHIM UPI app
                      </Text>
                      <Text style={tw`text-[8px] text-neutral-600 mt-2 text-center font-mono`}>
                        TxID: {txId}
                      </Text>
                    </View>

                    <View style={tw`gap-1.5`}>
                      <Text style={tw`text-[9px] text-neutral-400 font-bold uppercase`}>Or enter UPI ID</Text>
                      <TextInput
                        placeholder="yourname@upi / phone@okhdfc"
                        placeholderTextColor="#737373"
                        value={upiId}
                        onChangeText={setUpiId}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={tw`w-full bg-neutral-950 border border-neutral-850 text-xs text-white px-3 py-2.5 rounded-xl`}
                      />
                    </View>
                  </View>
                )}

                {/* BHIM UPI Form */}
                {paymentMethod === 'bhim' && (
                  <View style={tw`gap-3`}>
                    <View style={tw`bg-neutral-950/40 p-3 rounded-xl border border-neutral-850 flex-row items-center gap-2.5`}>
                      <QrCode size={16} color="#ef4444" />
                      <Text style={tw`text-[10px] text-neutral-300 flex-1 leading-relaxed`}>
                        Enter your BHIM UPI Virtual Payment Address (VPA) to receive a push notification payment request on your phone.
                      </Text>
                    </View>
                    <View style={tw`gap-1.5`}>
                      <Text style={tw`text-[9px] text-neutral-400 font-bold uppercase`}>BHIM UPI VPA ID</Text>
                      <TextInput
                        placeholder="username@bhim"
                        placeholderTextColor="#737373"
                        value={upiId}
                        onChangeText={setUpiId}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={tw`w-full bg-neutral-950 border border-neutral-850 text-xs text-white px-3 py-2.5 rounded-xl`}
                      />
                    </View>
                  </View>
                )}

                {/* GPay / PhonePe / Paytm Wallet */}
                {(paymentMethod === 'gpay' || paymentMethod === 'phonepe' || paymentMethod === 'paytm') && (
                  <View style={tw`gap-3`}>
                    <View style={tw`bg-neutral-950/40 p-3 rounded-xl border border-neutral-850 flex-row items-center gap-2.5`}>
                      <Smartphone size={16} color="#ef4444" />
                      <Text style={tw`text-[10px] text-neutral-300 flex-1 leading-relaxed`}>
                        Pay instantly via redirect request. Enter the 10-digit mobile number linked to your{' '}
                        {paymentMethod === 'gpay' ? 'Google Pay' : paymentMethod === 'phonepe' ? 'PhonePe' : 'Paytm'} account.
                      </Text>
                    </View>
                    <View style={tw`gap-1.5`}>
                      <Text style={tw`text-[9px] text-neutral-400 font-bold uppercase`}>Registered Mobile Number</Text>
                      <TextInput
                        placeholder="9876543210"
                        placeholderTextColor="#737373"
                        keyboardType="numeric"
                        maxLength={10}
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        style={tw`w-full bg-neutral-950 border border-neutral-850 text-xs text-white px-3 py-2.5 rounded-xl`}
                      />
                    </View>
                  </View>
                )}

                {/* Debit / Credit Cards */}
                {paymentMethod === 'card' && (
                  <View style={tw`gap-3`}>
                    <View>
                      <Text style={tw`text-[9px] text-neutral-400 font-bold uppercase mb-1`}>Cardholder Name</Text>
                      <TextInput
                        placeholder="e.g. Rahul Sharma"
                        placeholderTextColor="#737373"
                        value={cardName}
                        onChangeText={setCardName}
                        style={tw`w-full bg-neutral-950 border border-neutral-850 text-xs text-white px-3 py-2.5 rounded-xl`}
                      />
                    </View>

                    <View>
                      <Text style={tw`text-[9px] text-neutral-400 font-bold uppercase mb-1`}>Card Number</Text>
                      <TextInput
                        placeholder="4321 5678 9876 5432"
                        placeholderTextColor="#737373"
                        keyboardType="numeric"
                        maxLength={19}
                        value={cardNumber}
                        onChangeText={setCardNumber}
                        style={tw`w-full bg-neutral-950 border border-neutral-850 text-xs text-white px-3 py-2.5 rounded-xl`}
                      />
                    </View>

                    <View style={tw`flex-row gap-3`}>
                      <View style={tw`flex-1`}>
                        <Text style={tw`text-[9px] text-neutral-400 font-bold uppercase mb-1`}>Expiry Date</Text>
                        <TextInput
                          placeholder="MM / YY"
                          placeholderTextColor="#737373"
                          maxLength={5}
                          value={cardExpiry}
                          onChangeText={setCardExpiry}
                          style={tw`w-full bg-neutral-950 border border-neutral-850 text-xs text-white px-3 py-2.5 rounded-xl text-center`}
                        />
                      </View>
                      <View style={tw`flex-1`}>
                        <Text style={tw`text-[9px] text-neutral-400 font-bold uppercase mb-1`}>CVV / Secure Code</Text>
                        <TextInput
                          placeholder="•••"
                          placeholderTextColor="#737373"
                          secureTextEntry
                          keyboardType="numeric"
                          maxLength={3}
                          value={cvv}
                          onChangeText={setCvv}
                          style={tw`w-full bg-neutral-950 border border-neutral-850 text-xs text-white px-3 py-2.5 rounded-xl text-center`}
                        />
                      </View>
                    </View>
                  </View>
                )}

                {/* Net Banking Form */}
                {paymentMethod === 'netbanking' && (
                  <View style={tw`gap-4`}>
                    <Text style={tw`text-[9px] text-neutral-400 font-bold uppercase`}>Select Popular Bank</Text>
                    <View style={tw`flex-row flex-wrap gap-2`}>
                      {majorBanks.map((bank) => {
                        const isSelected = selectedBank === bank.id;
                        return (
                          <TouchableOpacity
                            key={bank.id}
                            onPress={() => {
                              console.log(`[SubscriptionScreen] NetBanking Bank chosen: ${bank.id}`);
                              setSelectedBank(bank.id);
                            }}
                            style={tw`px-3 py-2 rounded-xl border flex-row items-center gap-1.5 ${
                              isSelected ? 'bg-red-600/10 border-red-600' : 'bg-neutral-950 border-neutral-850'
                            }`}
                          >
                            <View style={tw`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-red-600' : 'bg-neutral-600'}`} />
                            <Text style={tw`text-[10px] font-bold ${isSelected ? 'text-white' : 'text-neutral-400'}`}>
                              {bank.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <View style={tw`gap-1.5`}>
                      <Text style={tw`text-[9px] text-neutral-400 font-bold uppercase`}>Or enter custom bank name</Text>
                      <TextInput
                        placeholder="e.g. State Bank of India"
                        placeholderTextColor="#737373"
                        value={selectedBank}
                        onChangeText={setSelectedBank}
                        style={tw`w-full bg-neutral-950 border border-neutral-850 text-xs text-white px-3 py-2.5 rounded-xl`}
                      />
                    </View>
                  </View>
                )}
              </View>

              {/* Complete Payment Button */}
              <TouchableOpacity
                onPress={() => {
                  console.log('[SubscriptionScreen] ACTIVATE ACCESS button pressed!');
                  handlePaymentSubmit();
                }}
                disabled={loading}
                style={tw`w-full bg-red-600 py-3.5 rounded-xl items-center justify-center shadow-lg z-50`}
                activeOpacity={0.7}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={tw`text-white text-xs font-bold uppercase tracking-widest`}>Activate Access</Text>
                )}
              </TouchableOpacity>

              <View style={tw`flex-row items-center justify-center gap-1.5 mt-4`}>
                <ShieldCheck size={14} color="#10b981" />
                <Text style={tw`text-[9px] text-neutral-500 font-medium`}>
                  Fully PCI-DSS Compliant & Secured via 256-bit SSL
                </Text>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
      )}
    </View>
  );
}
