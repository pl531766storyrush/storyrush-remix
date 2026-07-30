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
  Clipboard,
  ToastAndroid,
  Platform
} from 'react-native';
import { 
  ArrowLeft, 
  FileText, 
  ShieldCheck, 
  Coins, 
  Mail, 
  Copy, 
  Check,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react-native';
import tw from 'twrnc';

export type LegalPageType = 'privacy' | 'terms' | 'refund' | 'contact';

interface LegalPagesProps {
  pageType: LegalPageType;
  onClose: () => void;
}

export default function LegalPages({ pageType, onClose }: LegalPagesProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = () => {
    Clipboard.setString('pl531766@gmail.com');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderContent = () => {
    switch (pageType) {
      case 'privacy':
        return (
          <View style={tw`gap-6`}>
            <View style={tw`flex-row items-center gap-3 bg-red-600/10 border border-red-950/40 p-4 rounded-2xl`}>
              <ShieldCheck size={20} color="#ef4444" />
              <View style={tw`flex-1`}>
                <Text style={tw`text-neutral-100 text-xs font-black uppercase tracking-wider`}>Privacy Commitment</Text>
                <Text style={tw`text-[10px] text-neutral-400 mt-0.5`}>Your data security is our absolute priority. We never sell your personal information.</Text>
              </View>
            </View>

            <View style={tw`gap-4`}>
              <View>
                <Text style={tw`text-white font-black text-sm uppercase tracking-wider mb-1.5`}>1. Introduction</Text>
                <Text style={tw`text-neutral-400 text-xs leading-relaxed`}>
                  Welcome to Story Rush. We are committed to protecting your privacy and security. This Privacy Policy describes how we collect, use, and share your personal information when you use our mobile-friendly web application, watch short drama video streams, subscribe to premium tiers, or interact with other users.
                </Text>
              </View>

              <View>
                <Text style={tw`text-white font-black text-sm uppercase tracking-wider mb-1.5`}>2. Information We Collect</Text>
                <Text style={tw`text-neutral-400 text-xs leading-relaxed mb-2`}>
                  We collect the following categories of information to provide you with an optimal short-form entertainment experience:
                </Text>
                <Text style={tw`text-neutral-400 text-xs leading-relaxed pl-3 mb-1`}>
                  • <Text style={tw`text-white font-bold`}>Account Credentials:</Text> Your display name, email address, profile picture URL, and system-generated unique User ID (UID) provided during email registration or guest mode.
                </Text>
                <Text style={tw`text-neutral-400 text-xs leading-relaxed pl-3 mb-1`}>
                  • <Text style={tw`text-white font-bold`}>Engagement Data:</Text> Your watch history logs, favorite video marks, likes, shares, and comments left on various drama clips and episodes.
                </Text>
                <Text style={tw`text-neutral-400 text-xs leading-relaxed pl-3`}>
                  • <Text style={tw`text-white font-bold`}>Transaction Logs:</Text> Payment records processed via our third-party gateway, Cashfree. We do not store sensitive credit card numbers or banking passwords directly; Cashfree securely handles them.
                </Text>
              </View>

              <View>
                <Text style={tw`text-white font-black text-sm uppercase tracking-wider mb-1.5`}>3. How We Use Information</Text>
                <Text style={tw`text-neutral-400 text-xs leading-relaxed mb-2`}>
                  Story Rush utilizes collected information for:
                </Text>
                <Text style={tw`text-neutral-400 text-xs leading-relaxed pl-3 mb-1`}>
                  • Provisioning seamless video streaming feeds and maintaining user subscription status.
                </Text>
                <Text style={tw`text-neutral-400 text-xs leading-relaxed pl-3 mb-1`}>
                  • Synchronizing watch progress across devices so you can continue watching right where you left off.
                </Text>
                <Text style={tw`text-neutral-400 text-xs leading-relaxed pl-3 mb-1`}>
                  • Protecting the application from security breaches, spam comments, and fraudulent activities.
                </Text>
                <Text style={tw`text-neutral-400 text-xs leading-relaxed pl-3`}>
                  • Ensuring correct routing of payment orders and premium status delivery.
                </Text>
              </View>

              <View>
                <Text style={tw`text-white font-black text-sm uppercase tracking-wider mb-1.5`}>4. Sharing Your Information</Text>
                <Text style={tw`text-neutral-400 text-xs leading-relaxed`}>
                  We share your data only with third parties essential for the operations of the app:
                  {"\n"}• <Text style={tw`text-white font-bold`}>Firebase:</Text> For user authentication, cloud databases, and watch history storage.
                  {"\n"}• <Text style={tw`text-white font-bold`}>Cashfree Payments:</Text> To handle subscriptions and direct premium billing.
                  {"\n"}• <Text style={tw`text-white font-bold`}>Cloudinary:</Text> To host media content assets, posters, and thumbnails safely.
                </Text>
              </View>

              <View>
                <Text style={tw`text-white font-black text-sm uppercase tracking-wider mb-1.5`}>5. Data Retention & Safety</Text>
                <Text style={tw`text-neutral-400 text-xs leading-relaxed`}>
                  We retain your account details and engagement history for as long as your account exists. You can request the permanent deletion of your profile and data by reaching out to us. We implement industry-standard database rules to safeguard your information from unauthorized access.
                </Text>
              </View>

              <View>
                <Text style={tw`text-white font-black text-sm uppercase tracking-wider mb-1.5`}>6. Updates to This Policy</Text>
                <Text style={tw`text-neutral-400 text-xs leading-relaxed`}>
                  We may periodically revise our Privacy Policy to reflect app improvements or regulatory updates. Any modifications will be updated on this page with an updated effective date.
                </Text>
              </View>
            </View>
          </View>
        );
      case 'terms':
        return (
          <View style={tw`gap-6`}>
            <View style={tw`flex-row items-center gap-3 bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl`}>
              <FileText size={20} color="#f59e0b" />
              <View style={tw`flex-1`}>
                <Text style={tw`text-neutral-100 text-xs font-black uppercase tracking-wider`}>User Agreement</Text>
                <Text style={tw`text-[10px] text-neutral-400 mt-0.5`}>By registering or viewing videos in Story Rush, you unconditionally accept our terms of service.</Text>
              </View>
            </View>

            <View style={tw`gap-4`}>
              <View>
                <Text style={tw`text-white font-black text-sm uppercase tracking-wider mb-1.5`}>1. User Account Terms</Text>
                <Text style={tw`text-neutral-400 text-xs leading-relaxed`}>
                  You must be at least 13 years old to use Story Rush. Account details, including your email and display name, must be true and current. You are entirely responsible for all content posted under your account, including comments, likes, and profile changes.
                </Text>
              </View>

              <View>
                <Text style={tw`text-white font-black text-sm uppercase tracking-wider mb-1.5`}>2. Premium Subscription</Text>
                <Text style={tw`text-neutral-400 text-xs leading-relaxed`}>
                  Story Rush offers free episodic viewing alongside paid premium plans. Purchasing premium access provides VIP unlocking privileges, removes platform ads, and unlocks ultra high-definition video files. VIP features are activated immediately upon Cashfree payment confirmation.
                </Text>
              </View>

              <View>
                <Text style={tw`text-white font-black text-sm uppercase tracking-wider mb-1.5`}>3. Permitted Usage & Restraints</Text>
                <Text style={tw`text-neutral-400 text-xs leading-relaxed mb-2`}>
                  You are granted a limited, personal, non-exclusive, non-transferable license to access and stream Story Rush videos. You strictly agree not to:
                </Text>
                <Text style={tw`text-neutral-400 text-xs leading-relaxed pl-3 mb-1`}>
                  • Download, screen-record, rip, reverse-engineer, or commercially redistribute any drama clips.
                </Text>
                <Text style={tw`text-neutral-400 text-xs leading-relaxed pl-3 mb-1`}>
                  • Bypass premium payload locks, simulate transactions, or utilize cracked versions of the app.
                </Text>
                <Text style={tw`text-neutral-400 text-xs leading-relaxed pl-3`}>
                  • Post abusive, profane, hateful, or commercial spam comments under any video.
                </Text>
              </View>

              <View>
                <Text style={tw`text-white font-black text-sm uppercase tracking-wider mb-1.5`}>4. Intellectual Property Rights</Text>
                <Text style={tw`text-neutral-400 text-xs leading-relaxed`}>
                  All brand elements, source codes, media streams, character scripts, vector icons, graphics, and video content are the exclusive property of Story Rush. Violators will face immediate profile ban and legal escalation.
                </Text>
              </View>

              <View>
                <Text style={tw`text-white font-black text-sm uppercase tracking-wider mb-1.5`}>5. Indemnification & Liability</Text>
                <Text style={tw`text-neutral-400 text-xs leading-relaxed`}>
                  Story Rush is provided on an "as-is" and "as-available" streaming basis. We do not guarantee continuous, uninterrupted access due to server maintenance or third-party hosting variables. Story Rush is not liable for issues arising from network latency or banking-gateway failures.
                </Text>
              </View>
            </View>
          </View>
        );
      case 'refund':
        return (
          <View style={tw`gap-6`}>
            <View style={tw`flex-row items-center gap-3 bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl`}>
              <Coins size={20} color="#f59e0b" />
              <View style={tw`flex-1`}>
                <Text style={tw`text-neutral-100 text-xs font-black uppercase tracking-wider`}>Billing Safeguard</Text>
                <Text style={tw`text-[10px] text-neutral-400 mt-0.5`}>Transparency in subscriptions. Review our digital goods return conditions.</Text>
              </View>
            </View>

            <View style={tw`gap-4`}>
              <View>
                <Text style={tw`text-white font-black text-sm uppercase tracking-wider mb-1.5`}>1. Subscription Cancellation</Text>
                <Text style={tw`text-neutral-400 text-xs leading-relaxed`}>
                  You have the freedom to terminate your active VIP subscription at any point. Cancellation stops future auto-renewals from triggering. Following a cancellation request, you will retain unlimited premium access to Story Rush content until your current billing period naturally ends.
                </Text>
              </View>

              <View>
                <Text style={tw`text-white font-black text-sm uppercase tracking-wider mb-1.5`}>2. Non-Refundable Nature of Digital Goods</Text>
                <Text style={tw`text-neutral-400 text-xs leading-relaxed`}>
                  Because Story Rush offers digital, instantly streamed content and activates complete premium series immediately, all purchases and subscription charges are generally non-refundable. We do not offer partial refunds or prorated credits for mid-month cancellations.
                </Text>
              </View>

              <View>
                <Text style={tw`text-white font-black text-sm uppercase tracking-wider mb-1.5`}>3. Exceptional Refund Circumstances</Text>
                <Text style={tw`text-neutral-400 text-xs leading-relaxed mb-2`}>
                  We value user fairness. Under specific scenarios, we will manually audit and process refund applications:
                </Text>
                <Text style={tw`text-neutral-400 text-xs leading-relaxed pl-3 mb-1`}>
                  • <Text style={tw`text-white font-bold`}>Transaction Glitch:</Text> Double billing for the same subscription period on your payment card.
                </Text>
                <Text style={tw`text-neutral-400 text-xs leading-relaxed pl-3 mb-1`}>
                  • <Text style={tw`text-white font-bold`}>Provision Failure:</Text> Cashfree payment successfully executed but VIP privileges failed to apply to your UID after 24 hours.
                </Text>
                <Text style={tw`text-neutral-400 text-xs leading-relaxed pl-3`}>
                  • <Text style={tw`text-white font-bold`}>Billing Errors:</Text> Unscheduled charges due to a demonstrated platform software error.
                </Text>
              </View>

              <View>
                <Text style={tw`text-white font-black text-sm uppercase tracking-wider mb-1.5`}>4. Submitting a Refund Request</Text>
                <Text style={tw`text-neutral-400 text-xs leading-relaxed`}>
                  To apply for an exceptional refund, contact support via email within seven (7) calendar days of the charge. Please supply your user email, Firebase UID, exact date of transaction, and the billing receipt or Cashfree Transaction ID. Our team will review the claim and issue an update within 2-3 business days.
                </Text>
              </View>

              <View>
                <Text style={tw`text-white font-black text-sm uppercase tracking-wider mb-1.5`}>5. Processing Time</Text>
                <Text style={tw`text-neutral-400 text-xs leading-relaxed`}>
                  Once an exceptional refund is approved, the funds are reversed via our gateway back to the original funding account. Refund processing times typically span between 5 to 7 working days, subject to your banking institution's clearing policies.
                </Text>
              </View>
            </View>
          </View>
        );
      case 'contact':
        return (
          <View style={tw`gap-6`}>
            <View style={tw`bg-neutral-900 border border-neutral-800/80 p-5 rounded-2xl`}>
              <Text style={tw`text-white font-black text-sm uppercase tracking-wider mb-2`}>Support & Inquiries</Text>
              <Text style={tw`text-neutral-400 text-xs leading-relaxed mb-4`}>
                Got a suggestion? Encountering a playback loading error, or having trouble processing a Cashfree VIP payment? Our human customer support staff is on standby to assist you!
              </Text>

              <View style={tw`bg-neutral-950 border border-neutral-800 p-4 rounded-xl flex-row items-center justify-between`}>
                <View style={tw`flex-row items-center gap-3`}>
                  <View style={tw`w-10 h-10 rounded-full bg-red-600/15 items-center justify-center`}>
                    <Mail size={18} color="#ef4444" />
                  </View>
                  <View>
                    <Text style={tw`text-[10px] text-neutral-500 font-bold uppercase`}>Direct Support Email</Text>
                    <Text style={tw`text-xs font-black text-white`}>pl531766@gmail.com</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  onPress={handleCopyEmail}
                  style={tw`px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 flex-row items-center gap-1.5`}
                >
                  {copied ? (
                    <>
                      <Check size={12} color="#10b981" />
                      <Text style={tw`text-emerald-500 text-[10px] font-bold`}>Copied!</Text>
                    </>
                  ) : (
                    <>
                      <Copy size={12} color="#a3a3a3" />
                      <Text style={tw`text-neutral-400 text-[10px] font-bold`}>Copy</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={tw`gap-4`}>
              <View style={tw`flex-row items-start gap-3`}>
                <View style={tw`w-6 h-6 rounded bg-neutral-900 items-center justify-center border border-neutral-800 shrink-0 mt-0.5`}>
                  <Text style={tw`text-[10px] text-red-500 font-bold`}>01</Text>
                </View>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-white text-xs font-bold`}>Response Time Target</Text>
                  <Text style={tw`text-neutral-400 text-[11px] leading-relaxed mt-0.5`}>
                    We read and respond to every message personally. Our standard turnaround time is within 24 to 48 business hours.
                  </Text>
                </View>
              </View>

              <View style={tw`flex-row items-start gap-3`}>
                <View style={tw`w-6 h-6 rounded bg-neutral-900 items-center justify-center border border-neutral-800 shrink-0 mt-0.5`}>
                  <Text style={tw`text-[10px] text-red-500 font-bold`}>02</Text>
                </View>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-white text-xs font-bold`}>Include Details for Fast Resolution</Text>
                  <Text style={tw`text-neutral-400 text-[11px] leading-relaxed mt-0.5`}>
                    For swift resolution of billing issues, please include your registered email, Firebase UID (can be copied from your profile info), transaction date, and screenshot of your Cashfree payment receipt.
                  </Text>
                </View>
              </View>

              <View style={tw`flex-row items-start gap-3`}>
                <View style={tw`w-6 h-6 rounded bg-neutral-900 items-center justify-center border border-neutral-800 shrink-0 mt-0.5`}>
                  <Text style={tw`text-[10px] text-red-500 font-bold`}>03</Text>
                </View>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-white text-xs font-bold`}>Platform Feedback</Text>
                  <Text style={tw`text-neutral-400 text-[11px] leading-relaxed mt-0.5`}>
                    If you have series requests, translation fixes, or user interface suggestions, feel free to pitch them to our inbox!
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  const pageTitle = {
    privacy: 'Privacy Policy',
    terms: 'Terms & Conditions',
    refund: 'Refund & Cancellation',
    contact: 'Contact Us'
  }[pageType];

  return (
    <View style={tw`absolute inset-0 bg-neutral-950 z-50 flex-1`}>
      {/* Header */}
      <View style={tw`px-4 py-4 border-b border-neutral-900 flex-row items-center gap-3 bg-neutral-950`}>
        <TouchableOpacity 
          onPress={onClose}
          style={tw`w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800 items-center justify-center`}
        >
          <ArrowLeft size={16} color="#ffffff" />
        </TouchableOpacity>
        <View style={tw`flex-1`}>
          <Text style={tw`text-xs font-bold text-neutral-400 uppercase tracking-widest`}>Story Rush Legal</Text>
          <Text style={tw`text-sm font-black text-neutral-100`}>{pageTitle}</Text>
        </View>
      </View>

      {/* Document scroll */}
      <ScrollView 
        style={tw`flex-1`}
        contentContainerStyle={tw`px-5 pt-6 pb-20`}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}

        {/* Footer info statement */}
        <View style={tw`mt-12 pt-6 border-t border-neutral-900/60 items-center`}>
          <Text style={tw`text-[10px] text-neutral-500 font-bold uppercase tracking-widest`}>Story Rush</Text>
          <Text style={tw`text-[9px] text-neutral-600 mt-1`}>Last updated: July 2026</Text>
        </View>
      </ScrollView>
    </View>
  );
}
