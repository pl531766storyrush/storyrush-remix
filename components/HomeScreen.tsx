/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  FlatList, 
  Dimensions, 
  Share, 
  Modal, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  useWindowDimensions,
  Pressable,
  Image,
  Alert,
  ScrollView
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  setDoc, 
  doc, 
  deleteDoc, 
  updateDoc, 
  increment, 
  orderBy, 
  getDocs 
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { Drama, Comment, Category, Series, mapDocToDrama } from '../types';
import { 
  Heart, 
  MessageCircle, 
  Star, 
  Share2, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Award, 
  Plus, 
  Check, 
  X, 
  Send,
  Play,
  Trash2,
  Edit2,
  CornerDownRight,
  Lock,
  Film,
  Tv,
  ArrowLeft,
  ChevronRight,
  Grid,
  Flame,
  TrendingUp,
  Clock,
  Compass
} from 'lucide-react-native';
import tw from 'twrnc';

interface HomeScreenProps {
  onPremiumNav: () => void;
  activeCategory?: string | null;
  currentUser?: any;
  onOpenSeries?: (seriesId: string, seriesName: string) => void;
  onClearActiveCategory?: () => void;
}

interface HomeSeriesItem {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnailUrl: string;
  creator: string;
  tags: string[];
  episodeCount: number;
  episodes: Drama[];
  totalLikes: number;
}

const ExpoVideo = Video as any;

interface DramaCardItemProps {
  item: Drama;
  index: number;
  isCurrent: boolean;
  activeIndex: number;
  itemHeight: number;
  liked: boolean;
  favorited: boolean;
  followed: boolean;
  isMuted: boolean;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  toggleMute: () => void;
  handleFollow: (drama: Drama) => void;
  handleLike: (drama: Drama) => void;
  handleFavorite: (drama: Drama) => void;
  handleShare: (drama: Drama) => void;
  openComments: (drama: Drama) => void;
  onOpenSeries?: (seriesId: string, seriesName: string) => void;
  videoRefs: React.MutableRefObject<Record<string, any>>;
  onVideoError?: (index: number, errorMsg: string) => void;
  onVideoFinished?: (index: number) => void;
  isLastVideo?: boolean;
  isUserPremium?: boolean;
  onPremiumNav?: () => void;
}

const DramaCardItem = ({
  item,
  index,
  isCurrent,
  activeIndex,
  itemHeight,
  liked,
  favorited,
  followed,
  isMuted,
  isPlaying,
  setIsPlaying,
  toggleMute,
  handleFollow,
  handleLike,
  handleFavorite,
  handleShare,
  openComments,
  onOpenSeries,
  videoRefs,
  onVideoError,
  onVideoFinished,
  isLastVideo = false,
  isUserPremium = false,
  onPremiumNav,
}: DramaCardItemProps) => {
  const { width } = useWindowDimensions();
  const isDesktopFrame = Platform.OS === 'web' && width > 480;
  const [isActuallyPlaying, setIsActuallyPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [progress, setProgress] = useState(0);

  const [currentVideoUrl, setCurrentVideoUrl] = useState(item.videoUrl);
  const [showDescModal, setShowDescModal] = useState(false);

  const fullDescription = (item.description || item.title || '').trim();
  const cleanDesc = fullDescription
    .replace(/👍\s*Like.*|\bLike\s*•\s*Comment\s*•\s*Share\s*•\s*Follow\b/gi, '')
    .replace(/#\w+/g, '')
    .replace(/\s+/g, ' ')
    .trim() || item.title;

  const isLongDesc = cleanDesc.length > 65 || fullDescription.length > 65 || fullDescription.includes('\n') || (item.tags && item.tags.length > 0);
  const truncatedDesc = isLongDesc && cleanDesc.length > 65 ? cleanDesc.slice(0, 65).trim() : cleanDesc;

  useEffect(() => {
    setCurrentVideoUrl(item.videoUrl);
    setHasError(false);
    setIsLoaded(false);
    setIsActuallyPlaying(false);
  }, [item.videoUrl]);

  // Video playback time, seeking, and control overlay states
  const [durationMillis, setDurationMillis] = useState(0);
  const [positionMillis, setPositionMillis] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showLeftSeekFeedback, setShowLeftSeekFeedback] = useState(false);
  const [showRightSeekFeedback, setShowRightSeekFeedback] = useState(false);

  const isSeekingRef = useRef(false);
  const lastSeekTimeRef = useRef(0);
  const targetSeekPositionRef = useRef<number | null>(null);
  const lastSeekTimestampRef = useRef<number>(0);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const controlsTimeoutRef = useRef<any>(null);
  const leftSeekTimeoutRef = useRef<any>(null);
  const rightSeekTimeoutRef = useRef<any>(null);
  const clickCountRef = useRef(0);
  const clickTimeoutRef = useRef<any>(null);

  // Memoized video source to prevent reload/reset of player on state changes
  const videoSource = useMemo(() => ({ uri: currentVideoUrl }), [currentVideoUrl]);

  // Helper to safely locate the native HTML5 <video> element for direct currentTime manipulation (web-only)
  const getNativeVideoElement = () => {
    if (Platform.OS !== 'web' || typeof HTMLVideoElement === 'undefined' || typeof document === 'undefined') {
      return null;
    }
    const expoVideoInstance = videoRefs.current[item.id];
    if (!expoVideoInstance) return null;
    
    // 1. Try common expo-av web internal property names
    if (expoVideoInstance._video instanceof HTMLVideoElement) {
      return expoVideoInstance._video;
    }
    if (expoVideoInstance._nativeVideo instanceof HTMLVideoElement) {
      return expoVideoInstance._nativeVideo;
    }
    if (expoVideoInstance._videoRef?.current instanceof HTMLVideoElement) {
      return expoVideoInstance._videoRef.current;
    }
    
    // 2. Fallback to DOM querying for maximum resilience
    const cardContainer = document.getElementById(`drama-card-${item.id}`);
    if (cardContainer) {
      const videoEl = cardContainer.querySelector('video');
      if (videoEl) return videoEl;
    }
    
    // 3. Fallback to querying any video element that matches or contains this videoUrl
    const allVideos = document.querySelectorAll('video');
    for (let i = 0; i < allVideos.length; i++) {
      const v = allVideos[i];
      if (v.src && (v.src.includes(currentVideoUrl) || currentVideoUrl.includes(v.src))) {
        return v;
      }
    }
    
    return null;
  };

  // Time formatting helper
  const formatTime = (millis: number) => {
    if (isNaN(millis) || millis < 0) return '00:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const pad = (num: number) => num < 10 ? `0${num}` : num;
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  // Controls auto-hide manager
  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000); // Auto-hide controls after 3 seconds of inactivity
    }
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, isCurrent]);

  useEffect(() => {
    if (!isCurrent) {
      setProgress(0);
      setPositionMillis(0);
      setDurationMillis(0);
      setShowControls(true);
    }
  }, [isCurrent]);

  useEffect(() => {
    const video = videoRefs.current[item.id];
    if (!video) return;

    if (isCurrent && isPlaying) {
      if (item.isPremium === true && isUserPremium !== true) {
        setIsPlaying(false);
        return;
      }
      video.playAsync?.().catch((err: any) => {
        console.warn(`[Video ${item.id}] playAsync on effect failed:`, err);
      });
    } else {
      video.pauseAsync?.().catch((err: any) => {
        console.warn(`[Video ${item.id}] pauseAsync on effect failed:`, err);
      });
    }
  }, [isCurrent, isPlaying, activeIndex, item.isPremium, isUserPremium]);

  console.log(`[Video ${item.id}] videoUrl: ${currentVideoUrl}`); // Log as requested

  const isValidVideoUrl = (url: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;
    try {
      new URL(trimmed);
      return true;
    } catch (_) {
      return false;
    }
  };

  const hasValidVideo = isValidVideoUrl(currentVideoUrl);

  const handleVideoErrorAttempt = (errorMsg: string) => {
    console.warn(`[Video ${item.id}] Encountered playback error: ${errorMsg}`);
    setHasError(true);
    if (onVideoError) {
      onVideoError(index, errorMsg);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status) {
      console.log(`[Video ${item.id}] status update: videoUrl=${currentVideoUrl} isLoaded=${!!status.isLoaded} isPlaying=${!!status.isPlaying} error=${status.error || status.errorMessage || 'none'}`);
      
      const playbackError = status.error || status.errorMessage;
      if (playbackError) {
        console.warn(`[Video ${item.id}] Playback status error: ${playbackError}`);
        handleVideoErrorAttempt(String(playbackError));
      }

      if (status.didJustFinish) {
        console.log(`[Video ${item.id}] didJustFinish=true!`);
        if (onVideoFinished) {
          onVideoFinished(index);
        }
      }

      if (status.isLoaded) {
        setIsLoaded(true);
        const duration = status.durationMillis || 0;
        const position = status.positionMillis || 0;
        setDurationMillis(duration);
        
        // Prevent race condition/rollback of currentTime by checking if seek recently occurred
        const isRecentlySeeked = lastSeekTimestampRef.current > 0 && (Date.now() - lastSeekTimestampRef.current < 800);
        
        if (!isSeekingRef.current && !status.isSeeking && !isRecentlySeeked) {
          setPositionMillis(position);
          if (duration > 0) {
            setProgress((position / duration) * 100);
          } else {
            setProgress(0);
          }
        } else if (isRecentlySeeked && targetSeekPositionRef.current !== null) {
          // If the player status position matches our seek target position (within 500ms tolerance),
          // we can restore normal status tracking early
          if (Math.abs(position - targetSeekPositionRef.current) < 500) {
            targetSeekPositionRef.current = null;
            lastSeekTimestampRef.current = 0;
            setPositionMillis(position);
            if (duration > 0) {
              setProgress((position / duration) * 100);
            }
          }
        }
      }

      if (status.isLoaded && status.isPlaying) {
        setIsActuallyPlaying(true);
      } else {
        setIsActuallyPlaying(false);
      }
    }
  };

  // Play/pause toggler
  const togglePlayPause = async () => {
    if (item.isPremium === true && isUserPremium !== true) {
      setIsPlaying(false);
      return;
    }
    const video = videoRefs.current[item.id];
    if (!video) return;

    if (isPlaying) {
      setIsPlaying(false);
      try {
        await video.pauseAsync();
      } catch (err) {
        console.warn("Failed to pause video:", err);
      }
    } else {
      setIsPlaying(true);
      try {
        await video.playAsync();
      } catch (err) {
        console.warn("Failed to play video:", err);
      }
      // Pause all other active videos
      Object.keys(videoRefs.current).forEach((key) => {
        if (key !== item.id) {
          const otherVideo = videoRefs.current[key];
          if (otherVideo && typeof otherVideo.pauseAsync === 'function') {
            otherVideo.pauseAsync().catch(() => {});
          }
        }
      });
    }
  };

  // Draggable seek handler with throttling
  const handleSeek = (clientX: number, isFinal = false) => {
    const video = videoRefs.current[item.id];
    if (progressBarRef.current && video && durationMillis > 0) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const width = rect.width;
      const percentage = Math.min(100, Math.max(0, (clickX / width) * 100));
      setProgress(percentage);
      const newPosition = (percentage / 100) * durationMillis;
      setPositionMillis(newPosition);

      // Throttle seeking commands during active dragging (max once per 60ms)
      // to keep seek interaction smooth and prevent browser player choke.
      // Final seek (on pointer release) is always executed immediately.
      const now = Date.now();
      if (isFinal || now - lastSeekTimeRef.current > 60) {
        lastSeekTimeRef.current = now;
        
        if (isFinal) {
          targetSeekPositionRef.current = newPosition;
          lastSeekTimestampRef.current = now;
        }

        try {
          const videoEl = getNativeVideoElement();
          if (videoEl) {
            videoEl.currentTime = newPosition / 1000;
          }
          video.setPositionAsync(newPosition).catch(() => {});
        } catch (err) {
          console.warn("Direct seeking error:", err);
        }
      }
    }
  };

  const handlePointerDown = (e: any) => {
    if (e.button !== undefined && e.button !== 0) return;
    isSeekingRef.current = true;
    setIsSeeking(true);
    try {
      e.target.setPointerCapture(e.pointerId);
    } catch (err) {}
    handleSeek(e.clientX, false);
  };

  const handlePointerMove = (e: any) => {
    if (!isSeekingRef.current) return;
    handleSeek(e.clientX, false);
  };

  const handlePointerUp = (e: any) => {
    if (!isSeekingRef.current) return;
    try {
      e.target.releasePointerCapture(e.pointerId);
    } catch (err) {}

    // Perform final high-precision seek
    handleSeek(e.clientX, true);

    // Release seeking lock after a short delay so the player status settles
    setTimeout(() => {
      isSeekingRef.current = false;
      setIsSeeking(false);
    }, 400);
  };

  // Seek back/forward by a specific duration
  const seekDelta = async (seconds: number) => {
    const video = videoRefs.current[item.id];
    if (!video || durationMillis <= 0) return;
    
    isSeekingRef.current = true;
    setIsSeeking(true);

    const deltaMs = seconds * 1000;
    const newPosition = Math.min(durationMillis, Math.max(0, positionMillis + deltaMs));
    
    targetSeekPositionRef.current = newPosition;
    lastSeekTimestampRef.current = Date.now();

    setPositionMillis(newPosition);
    setProgress((newPosition / durationMillis) * 100);
    
    try {
      const videoEl = getNativeVideoElement();
      if (videoEl) {
        videoEl.currentTime = newPosition / 1000;
      }
      await video.setPositionAsync(newPosition);
    } catch (err) {
      console.warn("Failed to seek video:", err);
    }

    setTimeout(() => {
      isSeekingRef.current = false;
      setIsSeeking(false);
    }, 400);
  };

  // Click & tap gesture handler for single / double tap detection
  const handleCardPress = (e: any) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isLeft = clickX < rect.width * 2 / 5; // Left 40% of card
    const isRight = clickX > rect.width * 3 / 5; // Right 40% of card

    clickCountRef.current += 1;

    if (clickCountRef.current === 1) {
      clickTimeoutRef.current = setTimeout(() => {
        if (clickCountRef.current === 1) {
          // Single tap toggles Play/Pause and shows controls
          togglePlayPause();
          resetControlsTimeout();
        }
        clickCountRef.current = 0;
      }, 250);
    } else if (clickCountRef.current === 2) {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      clickCountRef.current = 0;

      // Handle Double Tap: left 40% seeks back 10s, right 40% seeks forward 10s. Middle is single tap.
      if (isLeft) {
        seekDelta(-10);
        setShowLeftSeekFeedback(true);
        if (leftSeekTimeoutRef.current) clearTimeout(leftSeekTimeoutRef.current);
        leftSeekTimeoutRef.current = setTimeout(() => setShowLeftSeekFeedback(false), 600);
      } else if (isRight) {
        seekDelta(10);
        setShowRightSeekFeedback(true);
        if (rightSeekTimeoutRef.current) clearTimeout(rightSeekTimeoutRef.current);
        rightSeekTimeoutRef.current = setTimeout(() => setShowRightSeekFeedback(false), 600);
      } else {
        // If double-tapped in the middle, we treat it as double single tap
        togglePlayPause();
      }
      resetControlsTimeout();
    }
  };

  return (
    <Pressable 
      id={`drama-card-${item.id}`}
      nativeID={`drama-card-${item.id}`}
      onPress={() => {}}
      style={[
        { height: itemHeight, width: '100%', position: 'relative', backgroundColor: '#000' },
        !isDesktopFrame ? { height: '100dvh' } as any : {}
      ]}
    >
      {/* Tap Gesture Handler Overlay */}
      <div
        onClick={handleCardPress}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10,
          touchAction: 'pan-y',
          cursor: 'pointer',
        }}
      />

      {/* Left Double Tap Feedback Overlay */}
      {showLeftSeekFeedback && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: '40%',
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 25,
            pointerEvents: 'none',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 32 }}>⏪</span>
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>-10s</span>
          </div>
        </div>
      )}

      {/* Right Double Tap Feedback Overlay */}
      {showRightSeekFeedback && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: '40%',
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 25,
            pointerEvents: 'none',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 32 }}>⏩</span>
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>+10s</span>
          </div>
        </div>
      )}
      {hasValidVideo && !hasError && Math.abs(index - activeIndex) <= 1 && !(item.isPremium === true && isUserPremium !== true) && (
        <ExpoVideo
          ref={(el: any) => {
            if (el) {
              videoRefs.current[item.id] = el;
              if (isCurrent && isPlaying) {
                if (item.isPremium === true && isUserPremium !== true) {
                  setIsPlaying(false);
                  return;
                }
                el.playAsync?.().catch((err: any) => {
                  console.warn("Play on ref attach failed:", err);
                });
              }
            } else {
              delete videoRefs.current[item.id];
            }
          }}
          source={videoSource}
          resizeMode={ResizeMode.COVER}
          shouldPlay={isCurrent && isPlaying}
          isLooping={false}
          isMuted={isMuted}
          playsInline={true}
          useNativeControls={false}
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          onLoad={(status: any) => {
            console.log(`[Video ${item.id}] onLoad status: isLoaded=${!!status?.isLoaded}, isPlaying=${!!status?.isPlaying}`);
            setIsLoaded(true);
            if (isCurrent && isPlaying) {
              if (item.isPremium === true && isUserPremium !== true) {
                setIsPlaying(false);
                return;
              }
              const el = videoRefs.current[item.id];
              el?.playAsync?.().catch((err: any) => {
                console.warn("Play on load failed:", err);
              });
              // Force direct browser video element play if available
              const nativeVideo = getNativeVideoElement();
              if (nativeVideo) {
                nativeVideo.play().catch((err: any) => {
                  console.warn("Direct HTML5 video play failed:", err);
                });
              }
            }
            if (status && status.isPlaying) {
              setIsActuallyPlaying(true);
            }
          }}
          onReadyForDisplay={() => {
            console.log(`[Video ${item.id}] onReadyForDisplay`);
            setIsLoaded(true);
            setIsActuallyPlaying(true);
            if (isCurrent && isPlaying) {
              if (item.isPremium === true && isUserPremium !== true) {
                setIsPlaying(false);
                return;
              }
              const el = videoRefs.current[item.id];
              el?.playAsync?.().catch((err: any) => {
                console.warn("Play on ready failed:", err);
              });
              const nativeVideo = getNativeVideoElement();
              if (nativeVideo) {
                nativeVideo.play().catch(() => {});
              }
            }
          }}
          onError={(error: any) => {
            const msg = error?.message || error || 'Format/Load error';
            console.warn(`[Video ${item.id}] onError: ${msg}`);
            handleVideoErrorAttempt(String(msg));
          }}
          style={tw`absolute inset-0 w-full h-full`}
        />
      )}

      {/* Thumbnail Overlay */}
      {(!isLoaded || hasError || (item.isPremium === true && isUserPremium !== true)) && (
        <img
          src={item.thumbnailUrl}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: isDesktopFrame ? '100%' : '100vw',
            height: isDesktopFrame ? '100%' : '100dvh',
            objectFit: 'cover',
            zIndex: 5,
            pointerEvents: 'none',
            filter: (item.isPremium === true && isUserPremium !== true) ? 'blur(10px) brightness(0.4)' : 'none',
          }}
          referrerPolicy="no-referrer"
        />
      )}

      {/* Premium Lock Overlay Screen */}
      {item.isPremium === true && isUserPremium !== true && (
        <View 
          style={[
            tw`absolute inset-0 bg-black/40 items-center justify-center px-6`,
            { zIndex: 40 }
          ]}
        >
          <View style={tw`w-full max-w-sm bg-neutral-900/90 border border-amber-500/30 rounded-3xl p-6 items-center shadow-2xl`}>
            {/* Golden Lock Icon */}
            <View style={tw`w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 items-center justify-center mb-4`}>
              <Lock size={24} color="#f59e0b" />
            </View>

            <Text style={tw`text-white font-black text-base text-center mb-1 tracking-tight`}>
              Premium Locked Episode
            </Text>
            
            <Text style={tw`text-amber-500 font-extrabold text-[8px] tracking-wider uppercase mb-3 bg-amber-500/10 px-2 py-0.5 rounded`}>
              Exclusive Episode {item.episodeNumber}
            </Text>

            <Text style={tw`text-neutral-400 text-xs text-center leading-relaxed mb-5`}>
              Subscribe to Story Rush Premium to unlock this episode and enjoy all series in Ultra HD without ads!
            </Text>

            {/* CTA button */}
            <TouchableOpacity 
              onPress={onPremiumNav}
              style={tw`w-full bg-gradient-to-r from-red-600 to-amber-500 py-3 rounded-2xl items-center shadow-lg active:scale-95`}
            >
              <Text style={tw`text-white text-xs font-black uppercase tracking-widest`}>
                Unlock Premium
              </Text>
            </TouchableOpacity>

            <Text style={tw`text-neutral-500 text-[9px] text-center mt-3`}>
              Plans starting from cheap weekly to yearly packs.
            </Text>
          </View>
        </View>
      )}

      {/* Error Message Overlay */}
      {hasError && (
        <View style={tw`absolute inset-0 bg-black/80 items-center justify-center p-6 z-10`}>
          <Text style={tw`text-white font-bold text-sm mb-1`}>Video Format Error</Text>
          <Text style={tw`text-neutral-400 text-xs text-center`}>Auto-skipping to the next drama...</Text>
        </View>
      )}

      {/* Play state Indicator overlay */}
      {!isPlaying && !hasError && (
        <View 
          pointerEvents="none"
          style={tw`absolute inset-0 m-auto w-16 h-16 bg-black/50 rounded-full items-center justify-center z-20 border border-neutral-800/30`}
        >
          <Play size={24} color="#ffffff" fill="#ffffff" style={tw`ml-1`} />
        </View>
      )}

      {/* Right Side Bar Controls */}
      <View 
        style={[
          tw`absolute right-4 z-20 items-center gap-6`,
          !isDesktopFrame 
            ? { bottom: 'calc(env(safe-area-inset-bottom, 0px) + 104px)' } as any 
            : { bottom: 104 } as any
        ]}
      >
        {/* Like Button */}
        <TouchableOpacity onPress={() => handleLike(item)} style={tw`items-center`}>
          <Heart size={28} color={liked ? '#ef4444' : '#ffffff'} fill={liked ? '#ef4444' : 'none'} />
          <Text style={tw`text-white text-[10px] font-bold mt-1 shadow`}>{item.likesCount || 0}</Text>
        </TouchableOpacity>

        {/* Comments Button */}
        <TouchableOpacity onPress={() => { openComments(item); }} style={tw`items-center`}>
          <MessageCircle size={28} color="#ffffff" />
          <Text style={tw`text-white text-[10px] font-bold mt-1 shadow`}>{item.commentsCount || 0}</Text>
        </TouchableOpacity>

        {/* Share Button */}
        <TouchableOpacity onPress={() => handleShare(item)} style={tw`items-center`}>
          <Share2 size={26} color="#ffffff" />
          <Text style={tw`text-white text-[10px] font-bold mt-1 shadow`}>Share</Text>
        </TouchableOpacity>

        {/* Volume Toggle */}
        <TouchableOpacity onPress={toggleMute} style={tw`w-10 h-10 rounded-full bg-black/40 items-center justify-center border border-white/10 mt-1`}>
          {isMuted ? <VolumeX size={18} color="#ef4444" /> : <Volume2 size={18} color="#ffffff" />}
        </TouchableOpacity>
      </View>

      {/* Bottom Video Metadata Description overlay */}
      <View 
        style={[
          tw`absolute left-4 right-20 z-20`,
          !isDesktopFrame 
            ? { bottom: 'calc(env(safe-area-inset-bottom, 0px) + 100px)' } as any 
            : { bottom: 100 } as any
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            if (onOpenSeries) {
              const sId = item.seriesId || item.seriesName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
              onOpenSeries(sId, item.seriesName);
            }
          }}
          style={tw`mb-1 self-start`}
        >
          <Text style={tw`text-white font-black text-sm tracking-wide shadow-md`}>
            {item.seriesName} <Text style={tw`text-amber-400 font-extrabold text-xs ml-1`}>Ep. {item.episodeNumber}</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={(e) => {
            e?.stopPropagation?.();
            setShowDescModal(true);
          }}
          style={tw`self-start max-w-[95%]`}
        >
          <Text style={tw`text-neutral-200 text-xs font-normal leading-snug shadow-md`} numberOfLines={2}>
            {truncatedDesc}
            {isLongDesc && (
              <Text style={tw`text-amber-400 font-extrabold text-xs tracking-wide`}> ... More</Text>
            )}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Interactive Controls Overlay (Seek bar and time indicators, fading in/out) */}
      <div
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: !isDesktopFrame ? 'calc(env(safe-area-inset-bottom, 0px) + 64px)' : 64,
          zIndex: 30,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          opacity: showControls ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
          pointerEvents: showControls ? 'auto' : 'none',
        }}
      >
        {/* Seek Bar and Time Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
          {/* Current Time */}
          <span style={{ color: '#fff', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
            {formatTime(positionMillis)}
          </span>

          {/* Interactive Draggable Progress Bar Container */}
          <div
            ref={progressBarRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              flex: 1,
              height: 16, // larger hit target area
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            {/* Background Track */}
            <div
              style={{
                width: '100%',
                height: 4,
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: 2,
                position: 'relative',
              }}
            >
              {/* Highlight Fill */}
              <div
                style={{
                  height: '100%',
                  backgroundColor: '#ef4444',
                  borderRadius: 2,
                  width: `${Math.min(100, Math.max(0, progress))}%`,
                }}
              />
              {/* Handle Indicator (Circle) */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: `${Math.min(100, Math.max(0, progress))}%`,
                  transform: 'translate(-50%, -50%)',
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                }}
              />
            </div>
          </div>

          {/* Total Duration */}
          <span style={{ color: '#fff', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
            {formatTime(durationMillis)}
          </span>
        </div>
      </div>

      {/* Subtle Bottom Progress Bar (only visible when interactive controls are hidden) */}
      {!showControls && (
        <View style={tw`absolute bottom-0 left-0 right-0 h-1 bg-neutral-900 z-20`}>
          <View style={{ height: '100%', backgroundColor: '#ef4444', width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </View>
      )}

      {/* Bottom Sheet Modal for Full Description and Tags */}
      {showDescModal && (
        <View style={tw`absolute inset-0 bg-black/70 justify-end z-50`}>
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={() => setShowDescModal(false)} 
            style={tw`flex-1`} 
          />
          <View style={[
            tw`bg-neutral-900 rounded-t-3xl p-5 border-t border-neutral-800 shadow-2xl`,
            { 
              maxHeight: Platform.OS === 'web' ? '65dvh' : '65%',
              marginBottom: isDesktopFrame ? 0 : 64 
            }
          ]}>
            {/* Modal Header */}
            <View style={tw`flex-row items-center justify-between pb-3 mb-3 border-b border-neutral-800`}>
              <View style={tw`flex-1 pr-3`}>
                <Text style={tw`text-white font-black text-base`}>
                  {item.seriesName} <Text style={tw`text-amber-400 text-sm font-extrabold`}>Ep. {item.episodeNumber}</Text>
                </Text>
                {item.title && (
                  <Text style={tw`text-neutral-400 text-xs font-medium mt-0.5`}>{item.title}</Text>
                )}
              </View>
              <TouchableOpacity 
                onPress={() => setShowDescModal(false)}
                style={tw`p-1.5 bg-neutral-800/80 rounded-full`}
              >
                <X size={18} color="#a3a3a3" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Description and Tags */}
            <ScrollView style={tw`max-h-72`} showsVerticalScrollIndicator={true}>
              <Text style={tw`text-neutral-200 text-xs font-normal leading-relaxed mb-4`}>
                {item.description || item.title}
              </Text>

              {item.tags && item.tags.length > 0 && (
                <View style={tw`mt-2 pt-3 border-t border-neutral-800/60`}>
                  <Text style={tw`text-[10px] font-black text-neutral-400 mb-2 uppercase tracking-wider`}>Tags</Text>
                  <View style={tw`flex-row flex-wrap gap-1.5`}>
                    {item.tags.map((tag) => (
                      <View key={tag} style={tw`bg-neutral-800 border border-neutral-700/60 px-2.5 py-1 rounded-lg`}>
                        <Text style={tw`text-xs text-amber-400 font-semibold`}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </Pressable>
  );
};

export default function HomeScreen({ 
  onPremiumNav, 
  activeCategory, 
  currentUser: propCurrentUser, 
  onOpenSeries,
  onClearActiveCategory 
}: HomeScreenProps) {
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [seriesList, setSeriesList] = useState<HomeSeriesItem[]>([]);
  const [selectedGenreFilter, setSelectedGenreFilter] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [showVolumeToast, setShowVolumeToast] = useState(false);
  
  // Interactions mapping
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [favoriteMap, setFavoriteMap] = useState<Record<string, boolean>>({});
  const [followedMap, setFollowedMap] = useState<Record<string, boolean>>({});

  // Comments drawer states
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [replyingToComment, setReplyingToComment] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Complete reactive authentication states and custom toast managers
  const currentUser = propCurrentUser;
  const [commentToast, setCommentToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null);

  const showCommentToast = (message: string, type: 'success' | 'error' = 'success') => {
    setCommentToast({ message, type });
    setTimeout(() => {
      setCommentToast(null);
    }, 3000);
  };

  const commentUnsubscribeRef = useRef<(() => void) | null>(null);

  const { height, width } = useWindowDimensions();

  const [layoutHeight, setLayoutHeight] = useState<number>(0);
  const onLayout = (event: any) => {
    const { height: h } = event.nativeEvent.layout;
    if (h > 0 && h !== layoutHeight) {
      setLayoutHeight(h);
    }
  };

  // Calculate exact item height for the video feed:
  const isWebFrame = Platform.OS === 'web' && width > 480;
  const containerPadding = width >= 768 ? 48 : 24; // p-6 is 48px, p-3 is 24px
  // Account for AndroidFrame status bar (40px) + bottom indicator (24px) + app's bottom tab bar (64px) = 128px
  const fallbackHeight = isWebFrame 
    ? (height - containerPadding - 128) 
    : height; // On standard mobile, let's use full viewport height (100dvh/100vh)
  const itemHeight = isWebFrame ? (layoutHeight || fallbackHeight) : height;

  // Track video players
  const videoRefs = useRef<Record<string, any>>({});
  const flatListRef = useRef<any>(null);

  const handleVideoError = (errIndex: number, errorMsg: string) => {
    console.warn(`[Feed Error Handler] Video at index ${errIndex} failed with message: "${errorMsg}". Skipping to next.`);
    
    // Check if the failing video is indeed the active (current) one:
    if (errIndex === activeIndex) {
      const nextIndex = errIndex + 1;
      if (nextIndex < dramas.length) {
        setTimeout(() => {
          try {
            setActiveIndex(nextIndex);
            flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
          } catch (e) {
            console.error("[Feed Error Handler] Scroll to index failed:", e);
          }
        }, 1500); // 1.5 seconds delay so user can see a friendly transition/message before auto-skip
      } else if (dramas.length > 1) {
        // If we are at the last index, wrap back to the first one
        setTimeout(() => {
          try {
            setActiveIndex(0);
            flatListRef.current?.scrollToIndex({ index: 0, animated: true });
          } catch (e) {
            console.error("[Feed Error Handler] Wrap scroll failed:", e);
          }
        }, 1500);
      }
    }
  };

  const handleVideoFinished = (finishedIndex: number) => {
    console.log(`[Feed Finished Handler] Video at index ${finishedIndex} finished playing.`);
    if (finishedIndex === activeIndex) {
      const nextIndex = finishedIndex + 1;
      if (nextIndex < dramas.length) {
        try {
          setActiveIndex(nextIndex);
          flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        } catch (e) {
          console.error("[Feed Finished Handler] Scroll to index failed:", e);
        }
      } else {
        // If it is the last video, loop back to the first video.
        try {
          setActiveIndex(0);
          flatListRef.current?.scrollToIndex({ index: 0, animated: true });
        } catch (e) {
          console.error("[Feed Finished Handler] Loop back to first failed:", e);
        }
      }
    }
  };

  // Listen to user profile real-time changes
  useEffect(() => {
    if (!currentUser) {
      setUserProfile(null);
      return;
    }
    if (currentUser.isGuest) {
      const loadGuestProfile = () => {
        let guestUser = currentUser;
        try {
          const stored = localStorage.getItem('storyrush_guest_user');
          if (stored) {
            guestUser = JSON.parse(stored);
          }
        } catch (e) {}

        setUserProfile({
          uid: guestUser.uid,
          displayName: guestUser.displayName,
          email: guestUser.email,
          photoURL: guestUser.photoURL,
          isPremium: !!guestUser.isPremium,
          role: 'user',
          createdAt: guestUser.createdAt,
          expiryDate: guestUser.expiryDate
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

  // Clean up comments subscription on unmount
  useEffect(() => {
    return () => {
      if (commentUnsubscribeRef.current) {
        commentUnsubscribeRef.current();
        commentUnsubscribeRef.current = null;
      }
    };
  }, []);

  // 1. Fetch series and episodes from Firestore
  useEffect(() => {
    setLoading(true);

    let seriesDocs: Series[] = [];
    let episodeDocs: Drama[] = [];

    const buildAndSetData = () => {
      // Group episodes by seriesId or normalized seriesName
      const groups: { [seriesId: string]: Drama[] } = {};
      episodeDocs.forEach(d => {
        const sKey = d.seriesId || (d.seriesName ? d.seriesName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') : 'default_series');
        if (!groups[sKey]) groups[sKey] = [];
        groups[sKey].push(d);
      });

      // Sort episodes in each group by episodeNumber
      Object.keys(groups).forEach(key => {
        groups[key].sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0));
      });

      // Build unified HomeSeriesItem list
      const combinedSeries: HomeSeriesItem[] = [];
      const processedKeys = new Set<string>();

      // 1. Process explicit Firestore series
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
          description: s.description || primaryEp?.description || '',
          category: s.category || primaryEp?.category || 'Drama',
          thumbnailUrl: primaryEp?.thumbnailUrl || s.thumbnailUrl || '',
          creator: s.creator || primaryEp?.creator || 'Story Rush Originals',
          tags: s.tags || primaryEp?.tags || ['Series', 'ShortDrama'],
          episodeCount: matchingEps.length,
          episodes: matchingEps,
          totalLikes: matchingEps.reduce((acc, curr) => acc + (curr.likesCount || 0), 0)
        });
      });

      // 2. Process any remaining episode groups not explicitly in 'series' collection
      Object.keys(groups).forEach(key => {
        if (!processedKeys.has(key)) {
          const matchingEps = groups[key];
          if (matchingEps.length > 0) {
            const primaryEp = matchingEps[0];
            const derivedTitle = primaryEp.seriesName || primaryEp.title || 'Untitled Series';
            combinedSeries.push({
              id: key,
              name: derivedTitle,
              description: primaryEp.description || 'Experience high-stakes drama and short stories on Story Rush.',
              category: primaryEp.category || 'Drama',
              thumbnailUrl: primaryEp.thumbnailUrl || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&q=80',
              creator: primaryEp.creator || 'Story Rush Originals',
              tags: primaryEp.tags || ['Series', 'ShortDrama'],
              episodeCount: matchingEps.length,
              episodes: matchingEps,
              totalLikes: matchingEps.reduce((acc, curr) => acc + (curr.likesCount || 0), 0)
            });
          }
        }
      });

      setSeriesList(combinedSeries);

      // Helper to check if two dramas belong to the exact same series
      const isSameSeries = (a: Drama, b: Drama): boolean => {
        if (a.seriesId && b.seriesId && a.seriesId === b.seriesId) return true;
        if (a.seriesName && b.seriesName && a.seriesName.trim().toLowerCase() === b.seriesName.trim().toLowerCase()) return true;
        if (a.seriesId && b.seriesName && a.seriesId === b.seriesName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')) return true;
        if (b.seriesId && a.seriesName && b.seriesId === a.seriesName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')) return true;
        return false;
      };

      // Prepare video feed - strictly isolated to current series only in sequential episode order
      let finalFeed: Drama[] = [];
      let targetIndex = 0;

      if (activeCategory) {
        const targetEp = episodeDocs.find(d => d.id === activeCategory);
        if (targetEp) {
          finalFeed = episodeDocs.filter(d => isSameSeries(d, targetEp));
          finalFeed.sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0));
          const foundIdx = finalFeed.findIndex(d => d.id === targetEp.id || d.episodeNumber === targetEp.episodeNumber);
          targetIndex = foundIdx >= 0 ? foundIdx : 0;
        } else {
          finalFeed = episodeDocs;
          targetIndex = 0;
        }
      } else {
        if (episodeDocs.length > 0) {
          const firstEp = episodeDocs[0];
          finalFeed = episodeDocs.filter(d => isSameSeries(d, firstEp));
          finalFeed.sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0));
        } else {
          finalFeed = [];
        }
        targetIndex = 0;
      }

      setDramas(finalFeed);
      setActiveIndex(targetIndex);
      if (flatListRef.current && finalFeed.length > 0) {
        setTimeout(() => {
          try {
            flatListRef.current?.scrollToIndex({ index: targetIndex, animated: false });
          } catch (e) {}
        }, 100);
      }
      setLoading(false);
    };

    const unsubSeries = onSnapshot(collection(db, "series"), (seriesSnap) => {
      seriesDocs = seriesSnap.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as Series));
      buildAndSetData();
    }, (err) => {
      console.warn("Series lookup error:", err);
      buildAndSetData();
    });

    const unsubEpisodes = onSnapshot(collection(db, "episodes"), (snapshot) => {
      episodeDocs = snapshot.docs.map(docSnap => mapDocToDrama(docSnap.id, docSnap.data()));
      buildAndSetData();
    }, (error) => {
      console.error(`[Firestore Error] Failed to listen to episodes:`, error);
      buildAndSetData();
    });

    return () => {
      unsubSeries();
      unsubEpisodes();
    };
  }, [activeCategory]);

  // Sync guest local overrides whenever currentUser or dramas length changes
  useEffect(() => {
    if (currentUser?.isGuest && dramas.length > 0) {
      try {
        const likesOverrides = JSON.parse(localStorage.getItem(`likes_count_overrides_${currentUser.uid}`) || '{}');
        
        let hasChanges = false;
        const updated = dramas.map(d => {
          let nextD = { ...d };
          let changed = false;
          if (likesOverrides[d.id] !== undefined && d.likesCount !== likesOverrides[d.id]) {
            nextD.likesCount = likesOverrides[d.id];
            changed = true;
          }
          // Dynamically compute commentsCount from actual comments stored in localStorage for this drama
          const storedComments = localStorage.getItem(`comments_${currentUser.uid}_${d.id}`);
          let nextCommentsCount = d.commentsCount || 0;
          if (storedComments) {
            try {
              const parsed = JSON.parse(storedComments);
              if (Array.isArray(parsed)) {
                nextCommentsCount = parsed.length;
              }
            } catch (parseErr) {}
          }
          if (d.commentsCount !== nextCommentsCount) {
            nextD.commentsCount = nextCommentsCount;
            changed = true;
          }
          if (changed) {
            hasChanges = true;
          }
          return nextD;
        });

        if (hasChanges) {
          setDramas(updated);
        }
      } catch (e) {
        console.warn("Failed to synchronize guest overrides in useEffect", e);
      }
    }
  }, [currentUser, dramas.length]);

  // 2. Fetch User likes, favorites, follows
  useEffect(() => {
    if (!currentUser || dramas.length === 0) return;

    if (currentUser.isGuest) {
      try {
        const localLikes = JSON.parse(localStorage.getItem(`likes_${currentUser.uid}`) || '{}');
        const localFavs = JSON.parse(localStorage.getItem(`favs_${currentUser.uid}`) || '{}');
        const localFollows = JSON.parse(localStorage.getItem(`follows_${currentUser.uid}`) || '{}');
        setLikedMap(localLikes);
        setFavoriteMap(localFavs);
        setFollowedMap(localFollows);
      } catch (err) {
        console.warn("Failed to load local interactions for guest", err);
      }
      return;
    }

    // Fetch Likes
    const likesQuery = query(collection(db, 'likes'), where('userId', '==', currentUser.uid));
    const unsubscribeLikes = onSnapshot(likesQuery, (snapshot) => {
      const likes: Record<string, boolean> = {};
      snapshot.forEach(docSnap => {
        likes[docSnap.data().dramaId] = true;
      });
      setLikedMap(likes);
    });

    // Fetch Favorites
    const favQuery = query(collection(db, 'favorites'), where('userId', '==', currentUser.uid));
    const unsubscribeFavs = onSnapshot(favQuery, (snapshot) => {
      const favs: Record<string, boolean> = {};
      snapshot.forEach(docSnap => {
        favs[docSnap.data().dramaId] = true;
      });
      setFavoriteMap(favs);
    });

    // Fetch Follows
    const followQuery = query(collection(db, 'follows'), where('followerId', '==', currentUser.uid));
    const unsubscribeFollows = onSnapshot(followQuery, (snapshot) => {
      const follows: Record<string, boolean> = {};
      snapshot.forEach(docSnap => {
        follows[docSnap.data().followedId] = true;
      });
      setFollowedMap(follows);
    });

    return () => {
      unsubscribeLikes();
      unsubscribeFavs();
      unsubscribeFollows();
    };
  }, [currentUser, dramas]);

  // 3. Manage video autoplay/pause on index changes
  useEffect(() => {
    // Stop all videos except the active index
    Object.keys(videoRefs.current).forEach((key) => {
      const video = videoRefs.current[key];
      if (video) {
        if (key === dramas[activeIndex]?.id) {
          const currentDrama = dramas[activeIndex];
          const isUserPremium = !!userProfile?.isPremium;
          if (currentDrama?.isPremium === true && isUserPremium !== true) {
            setIsPlaying(false);
            if (typeof video.pauseAsync === 'function') {
              video.pauseAsync().catch(() => {});
            }
          } else if (isPlaying) {
            if (typeof video.playAsync === 'function') {
              video.playAsync().catch(() => {});
            }
          } else {
            if (typeof video.pauseAsync === 'function') {
              video.pauseAsync().catch(() => {});
            }
          }
        } else {
          if (typeof video.stopAsync === 'function') {
            video.stopAsync().catch(() => {});
          }
        }
      }
    });

    if (dramas[activeIndex]) {
      saveWatchProgress(dramas[activeIndex]);
    }
  }, [activeIndex, isPlaying, dramas]);

  // 4. Watch progress tracker
  const saveWatchProgress = async (drama: Drama) => {
    if (!currentUser) return;
    if (currentUser.isGuest) {
      try {
        const localHistory = JSON.parse(localStorage.getItem(`history_${currentUser.uid}`) || '[]');
        const updated = [{
          id: `${currentUser.uid}_${drama.id}`,
          userId: currentUser.uid,
          dramaId: drama.id,
          progress: 10,
          duration: drama.duration || 30,
          updatedAt: new Date().toISOString()
        }, ...localHistory.filter((item: any) => item.dramaId !== drama.id)];
        localStorage.setItem(`history_${currentUser.uid}`, JSON.stringify(updated.slice(0, 50)));
      } catch (err) {
        // silent
      }
      return;
    }
    const historyId = `${currentUser.uid}_${drama.id}`;
    try {
      await setDoc(doc(db, 'history', historyId), {
        id: historyId,
        userId: currentUser.uid,
        dramaId: drama.id,
        progress: 10, // Simulated watch progress in seconds
        duration: drama.duration || 30,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      // Catch history update errors silently
    }
  };

  // 5. User Interaction Actions
  const handleLike = async (drama: Drama) => {
    if (!currentUser) return;
    const dramaId = drama.id;
    const likeId = `${currentUser.uid}_${dramaId}`;
    const liked = likedMap[dramaId];

    if (currentUser.isGuest) {
      const nextLiked = !liked;
      const newLikedMap = { ...likedMap, [dramaId]: nextLiked };
      setLikedMap(newLikedMap);
      try {
        localStorage.setItem(`likes_${currentUser.uid}`, JSON.stringify(newLikedMap));
      } catch (err) {}

      // Update dramas state to update UI immediately & save overrides
      setDramas(prevDramas => prevDramas.map(d => {
        if (d.id === dramaId) {
          const change = nextLiked ? 1 : -1;
          const nextCount = Math.max(0, (d.likesCount || 0) + change);
          try {
            const localOverrides = JSON.parse(localStorage.getItem(`likes_count_overrides_${currentUser.uid}`) || '{}');
            localOverrides[dramaId] = nextCount;
            localStorage.setItem(`likes_count_overrides_${currentUser.uid}`, JSON.stringify(localOverrides));
          } catch (err) {}
          return {
            ...d,
            likesCount: nextCount
          };
        }
        return d;
      }));
      return;
    }

    try {
      if (liked) {
        await deleteDoc(doc(db, 'likes', likeId));
        await updateDoc(doc(db, 'dramas', dramaId), { likesCount: increment(-1) });
        await updateDoc(doc(db, 'episodes', dramaId), { likesCount: increment(-1) });
      } else {
        await setDoc(doc(db, 'likes', likeId), {
          id: likeId,
          userId: currentUser.uid,
          dramaId: dramaId,
          createdAt: new Date().toISOString()
        });
        await updateDoc(doc(db, 'dramas', dramaId), { likesCount: increment(1) });
        await updateDoc(doc(db, 'episodes', dramaId), { likesCount: increment(1) });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `likes/${likeId}`);
    }
  };

  const handleFavorite = async (drama: Drama) => {
    if (!currentUser) return;
    const dramaId = drama.id;
    const favId = `${currentUser.uid}_${dramaId}`;
    const favorited = favoriteMap[dramaId];

    if (currentUser.isGuest) {
      const nextFav = !favorited;
      const newFavMap = { ...favoriteMap, [dramaId]: nextFav };
      setFavoriteMap(newFavMap);
      try {
        localStorage.setItem(`favs_${currentUser.uid}`, JSON.stringify(newFavMap));
      } catch (err) {}
      return;
    }

    try {
      if (favorited) {
        await deleteDoc(doc(db, 'favorites', favId));
      } else {
        await setDoc(doc(db, 'favorites', favId), {
          id: favId,
          userId: currentUser.uid,
          dramaId: dramaId,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `favorites/${favId}`);
    }
  };

  const handleFollow = async (drama: Drama) => {
    if (!currentUser) return;
    const followedId = drama.creator || 'storyrush_creator';
    const followId = `${currentUser.uid}_${followedId}`;
    const followed = followedMap[followedId];

    if (currentUser.isGuest) {
      const nextFollow = !followed;
      const newFollowedMap = { ...followedMap, [followedId]: nextFollow };
      setFollowedMap(newFollowedMap);
      try {
        localStorage.setItem(`follows_${currentUser.uid}`, JSON.stringify(newFollowedMap));
      } catch (err) {}
      return;
    }

    try {
      if (followed) {
        await deleteDoc(doc(db, 'follows', followId));
      } else {
        await setDoc(doc(db, 'follows', followId), {
          id: followId,
          followerId: currentUser.uid,
          followedId: followedId,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `follows/${followId}`);
    }
  };

  const handleShare = async (drama: Drama) => {
    const shareText = `Check out Episode ${drama.episodeNumber} of "${drama.seriesName}" on Story Rush!`;
    try {
      await Share.share({
        message: shareText,
        url: drama.videoUrl
      });
      await updateDoc(doc(db, 'dramas', drama.id), { sharesCount: increment(1) });
      await updateDoc(doc(db, 'episodes', drama.id), { sharesCount: increment(1) });
    } catch (err) {
      // Error sharing
    }
  };

  // Helper for formatting time ago
  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  };

  // Comments handlers
  const openComments = async (drama: Drama) => {
    console.log(`[openComments] Opening comments for drama ID: ${drama.id}`);
    setShowComments(true);
    setLoadingComments(true);
    setCommentsError(null);
    setReplyingToComment(null);
    setEditingComment(null);

    // Clean up active listener if any
    if (commentUnsubscribeRef.current) {
      console.log('[openComments] Cleaning up previous comment listener.');
      commentUnsubscribeRef.current();
      commentUnsubscribeRef.current = null;
    }

    if (currentUser?.isGuest) {
      try {
        const stored = localStorage.getItem(`comments_${currentUser.uid}_${drama.id}`);
        const guestComments: Comment[] = stored ? JSON.parse(stored) : [];
        guestComments.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setComments(guestComments);
      } catch (err) {
        console.warn("Failed to load local comments for guest user", err);
        setComments([]);
      }
      setLoadingComments(false);
      return;
    }

    try {
      // Robust query without orderBy to ensure no composite index is required in Firestore
      const commentsQuery = query(
        collection(db, 'comments'),
        where('dramaId', '==', drama.id)
      );

      console.log(`[openComments] Subscribing to comments for dramaId: ${drama.id}`);
      const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
        console.log(`[openComments] Snapshot received. Found ${snapshot.size} comments.`);
        const list: Comment[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          list.push({ id: docSnap.id, ...data } as Comment);
        });
        
        // Sort in-memory descending by createdAt (newest first)
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        
        setComments(list);
        setLoadingComments(false);
        setCommentsError(null);
      }, (err) => {
        console.error("[openComments] Firestore onSnapshot error:", err);
        const errMsg = err instanceof Error ? err.message : String(err);
        setCommentsError(`Real-time sync failed: ${errMsg}. Showing cached/direct comments.`);
        
        // Attempt immediate direct fetch fallback
        const fallbackQuery = query(collection(db, 'comments'), where('dramaId', '==', drama.id));
        getDocs(fallbackQuery).then(snapshot => {
          console.log(`[openComments] Fallback getDocs fetched ${snapshot.size} comments.`);
          const list: Comment[] = [];
          snapshot.forEach(docSnap => {
            list.push({ id: docSnap.id, ...docSnap.data() } as Comment);
          });
          list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          setComments(list);
          setLoadingComments(false);
        }).catch(fallbackErr => {
          const fErr = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
          setCommentsError(`Failed to load comments: ${fErr}`);
          setLoadingComments(false);
        });
      });

      commentUnsubscribeRef.current = unsubscribe;
    } catch (err) {
      console.error("[openComments] Setup error:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setCommentsError(`Failed to open comments stream: ${errMsg}`);
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    console.log('[handleAddComment] Add comment triggered.');
    if (!newCommentText.trim()) {
      console.warn('[handleAddComment] Empty comment text.');
      return;
    }
    if (!currentUser) {
      console.warn('[handleAddComment] User not authenticated.');
      showCommentToast('Please sign in to post a comment.', 'error');
      return;
    }
    const activeDrama = dramas[activeIndex];
    if (!activeDrama) {
      console.error('[handleAddComment] No active drama found.');
      return;
    }

    setSendingComment(true);
    const commentText = newCommentText.trim();

    try {
      if (currentUser.isGuest) {
        let nextComments: Comment[] = [];
        try {
          const stored = localStorage.getItem(`comments_${currentUser.uid}_${activeDrama.id}`);
          nextComments = stored ? JSON.parse(stored) : [];
        } catch (e) {
          console.warn("Failed to read comments from localStorage", e);
        }

        if (editingComment) {
          nextComments = nextComments.map(c => c.id === editingComment.id ? { ...c, text: commentText } : c);
          
          // Always sort descending by createdAt (newest first)
          nextComments.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          setComments(nextComments);
          try {
            localStorage.setItem(`comments_${currentUser.uid}_${activeDrama.id}`, JSON.stringify(nextComments));
          } catch (err) {}
          showCommentToast("Comment edited successfully!");
          setEditingComment(null);
          setNewCommentText('');
        } else if (replyingToComment) {
          const commentId = `comment_${Date.now()}`;
          const replyData: Comment = {
            id: commentId,
            dramaId: activeDrama.id,
            videoId: activeDrama.id,
            userId: currentUser.uid,
            userName: currentUser.displayName || 'Guest Fan',
            userPhoto: currentUser.photoURL,
            text: commentText,
            createdAt: new Date().toISOString(),
            parentId: replyingToComment.id,
            likes: []
          };
          nextComments = [...nextComments, replyData];
          
          // Always sort descending by createdAt (newest first)
          nextComments.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          setComments(nextComments);
          try {
            localStorage.setItem(`comments_${currentUser.uid}_${activeDrama.id}`, JSON.stringify(nextComments));
          } catch (err) {}

          // Update commentsCount in UI to the actual length
          setDramas(prevDramas => prevDramas.map(d => {
            if (d.id === activeDrama.id) {
              return { ...d, commentsCount: nextComments.length };
            }
            return d;
          }));

          showCommentToast("Reply posted successfully!");
          setReplyingToComment(null);
          setNewCommentText('');
        } else {
          const commentId = `comment_${Date.now()}`;
          const commentData: Comment = {
            id: commentId,
            dramaId: activeDrama.id,
            videoId: activeDrama.id,
            userId: currentUser.uid,
            userName: currentUser.displayName || 'Guest Fan',
            userPhoto: currentUser.photoURL,
            text: commentText,
            createdAt: new Date().toISOString(),
            likes: []
          };
          nextComments = [commentData, ...nextComments];
          
          // Always sort descending by createdAt (newest first)
          nextComments.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          setComments(nextComments);
          try {
            localStorage.setItem(`comments_${currentUser.uid}_${activeDrama.id}`, JSON.stringify(nextComments));
          } catch (err) {}

          // Update commentsCount in UI to the actual length
          setDramas(prevDramas => prevDramas.map(d => {
            if (d.id === activeDrama.id) {
              return { ...d, commentsCount: nextComments.length };
            }
            return d;
          }));

          showCommentToast("Comment posted successfully!");
          setNewCommentText('');
        }
        setSendingComment(false);
        return;
      }

      if (editingComment) {
        console.log(`[handleAddComment] Editing existing comment ID: ${editingComment.id}`);
        // Optimistic local state update
        setComments(prev => prev.map(c => c.id === editingComment.id ? { ...c, text: commentText } : c));

        const commentRef = doc(db, 'comments', editingComment.id);
        await updateDoc(commentRef, {
          text: commentText
        });
        
        console.log('[handleAddComment] Comment edit saved successfully in Firestore.');
        showCommentToast("Comment edited successfully!");
        setEditingComment(null);
        setNewCommentText('');
      } else if (replyingToComment) {
        console.log(`[handleAddComment] Replying to parent comment ID: ${replyingToComment.id}`);
        const commentId = `comment_${Date.now()}`;
        const replyData: Comment = {
          id: commentId,
          dramaId: activeDrama.id,
          videoId: activeDrama.id, // Ensure each comment is linked to the correct videoId / dramaId
          userId: currentUser.uid,
          userName: userProfile?.displayName || currentUser.displayName || 'Drama Fan',
          userPhoto: userProfile?.photoURL || currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.uid}`,
          text: commentText,
          createdAt: new Date().toISOString(),
          parentId: replyingToComment.id,
          likes: []
        };

        // Optimistic local state update
        setComments(prev => [...prev, replyData]);
        setDramas(prev => prev.map(d => d.id === activeDrama.id ? { ...d, commentsCount: (d.commentsCount || 0) + 1 } : d));

        await setDoc(doc(db, 'comments', commentId), replyData);
        await updateDoc(doc(db, 'dramas', activeDrama.id), { commentsCount: increment(1) });
        await updateDoc(doc(db, 'episodes', activeDrama.id), { commentsCount: increment(1) });
        
        console.log('[handleAddComment] Reply comment saved successfully in Firestore.');
        showCommentToast("Reply posted successfully!");
        setReplyingToComment(null);
        setNewCommentText('');
      } else {
        console.log('[handleAddComment] Creating new root comment.');
        const commentId = `comment_${Date.now()}`;
        const commentData: Comment = {
          id: commentId,
          dramaId: activeDrama.id,
          videoId: activeDrama.id, // Ensure each comment is linked to the correct videoId / dramaId
          userId: currentUser.uid,
          userName: userProfile?.displayName || currentUser.displayName || 'Drama Fan',
          userPhoto: userProfile?.photoURL || currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.uid}`,
          text: commentText,
          createdAt: new Date().toISOString(),
          likes: []
        };

        // Optimistic local state update - prepending new root comment so it appears instantly at the top
        setComments(prev => [commentData, ...prev]);
        setDramas(prev => prev.map(d => d.id === activeDrama.id ? { ...d, commentsCount: (d.commentsCount || 0) + 1 } : d));

        await setDoc(doc(db, 'comments', commentId), commentData);
        await updateDoc(doc(db, 'dramas', activeDrama.id), { commentsCount: increment(1) });
        await updateDoc(doc(db, 'episodes', activeDrama.id), { commentsCount: increment(1) });
        
        console.log('[handleAddComment] Root comment saved successfully in Firestore.');
        showCommentToast("Comment posted successfully!");
        setNewCommentText('');
      }
    } catch (err: any) {
      console.error("[handleAddComment] Error saving comment:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      showCommentToast(`Failed to save comment: ${errMsg}`, 'error');
      try {
        handleFirestoreError(err, OperationType.WRITE, `comments`);
      } catch (e) {
        // Suppress secondary throw so app state doesn't crash
      }
    } finally {
      setSendingComment(false);
    }
  };

  const handleLikeComment = async (item: Comment) => {
    if (!currentUser) {
      showCommentToast('Please sign in to like comments.', 'error');
      return;
    }
    const currentLikes = item.likes || [];
    const isLiked = currentLikes.includes(currentUser.uid);
    let newLikes: string[];
    if (isLiked) {
      newLikes = currentLikes.filter(uid => uid !== currentUser.uid);
    } else {
      newLikes = [...currentLikes, currentUser.uid];
    }

    // Optimistically update local comments state
    setComments(prev => prev.map(c => c.id === item.id ? { ...c, likes: newLikes } : c));

    if (currentUser.isGuest) {
      try {
        localStorage.setItem(`comments_${currentUser.uid}_${item.dramaId}`, JSON.stringify(
          comments.map(c => c.id === item.id ? { ...c, likes: newLikes } : c)
        ));
      } catch (err) {}
      return;
    }

    try {
      await updateDoc(doc(db, 'comments', item.id), {
        likes: newLikes
      });
    } catch (err: any) {
      console.error("Error liking comment:", err);
      // Revert optimistic update on error
      setComments(prev => prev.map(c => c.id === item.id ? { ...c, likes: currentLikes } : c));
      showCommentToast(`Failed to like comment: ${err.message || err}`, 'error');
    }
  };

  const handleDeleteComment = (item: Comment) => {
    if (!currentUser || currentUser.uid !== item.userId) {
      showCommentToast('You can only delete your own comments.', 'error');
      return;
    }
    setCommentToDelete(item);
  };

  const handleDeleteCommentConfirm = async (item: Comment) => {
    const activeDrama = dramas[activeIndex];
    if (!activeDrama) return;

    if (currentUser.isGuest) {
      const repliesToDelete = comments.filter(c => c.parentId === item.id);
      const nextComments = comments.filter(c => c.id !== item.id && c.parentId !== item.id);
      setComments(nextComments);
      try {
        localStorage.setItem(`comments_${currentUser.uid}_${activeDrama.id}`, JSON.stringify(nextComments));
      } catch (err) {}

      // Update commentsCount in UI dynamically
      setDramas(prevDramas => prevDramas.map(d => {
        if (d.id === activeDrama.id) {
          return { ...d, commentsCount: nextComments.length };
        }
        return d;
      }));

      if (editingComment?.id === item.id) {
        setEditingComment(null);
        setNewCommentText('');
      }
      if (replyingToComment?.id === item.id) {
        setReplyingToComment(null);
        setNewCommentText('');
      }
      showCommentToast("Comment deleted successfully!");
      setCommentToDelete(null);
      return;
    }

    try {
      // Find replies to delete if this is a parent comment
      const repliesToDelete = comments.filter(c => c.parentId === item.id);
      const totalDocsToDelete = 1 + repliesToDelete.length;

      // Optimistically update local comments state
      setComments(prev => prev.filter(c => c.id !== item.id && c.parentId !== item.id));
      setDramas(prev => prev.map(d => d.id === activeDrama.id ? { ...d, commentsCount: Math.max(0, (d.commentsCount || 0) - totalDocsToDelete) } : d));

      // Delete the comment itself
      await deleteDoc(doc(db, 'comments', item.id));

      // Delete all replies
      for (const reply of repliesToDelete) {
        await deleteDoc(doc(db, 'comments', reply.id));
      }

      // Decrement comment count on drama and episode documents
      await updateDoc(doc(db, 'dramas', activeDrama.id), { commentsCount: increment(-totalDocsToDelete) });
      await updateDoc(doc(db, 'episodes', activeDrama.id), { commentsCount: increment(-totalDocsToDelete) });

      // If we are currently editing or replying to this comment, reset it
      if (editingComment?.id === item.id) {
        setEditingComment(null);
        setNewCommentText('');
      }
      if (replyingToComment?.id === item.id) {
        setReplyingToComment(null);
        setNewCommentText('');
      }

      showCommentToast("Comment deleted successfully!");
    } catch (err: any) {
      console.error("Error deleting comment:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      showCommentToast(`Failed to delete: ${errMsg}`, 'error');
    } finally {
      setCommentToDelete(null);
    }
  };

  const handleStartReply = (item: Comment) => {
    setReplyingToComment(item);
    setEditingComment(null);
    setNewCommentText('');
  };

  const handleStartEdit = (item: Comment) => {
    if (!currentUser || currentUser.uid !== item.userId) {
      showCommentToast('You can only edit your own comments.', 'error');
      return;
    }
    setEditingComment(item);
    setReplyingToComment(null);
    setNewCommentText(item.text);
  };

  const closeComments = () => {
    setShowComments(false);
    if (commentUnsubscribeRef.current) {
      commentUnsubscribeRef.current();
      commentUnsubscribeRef.current = null;
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    setShowVolumeToast(true);
    setTimeout(() => setShowVolumeToast(false), 1500);
  };

  // 6. Viewable item detection
  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      const idx = viewableItems[0].index ?? 0;
      setActiveIndex(idx);
    }
  }).current;

  // Track watch history for Continue Watching row
  const [homeHistory, setHomeHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.isGuest) {
      try {
        const stored = localStorage.getItem(`history_${currentUser.uid}`);
        if (stored) {
          setHomeHistory(JSON.parse(stored));
        }
      } catch (e) {}
      return;
    }

    const q = query(collection(db, 'history'), where('userId', '==', currentUser.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() }));
      setHomeHistory(list);
    }, (err) => console.warn("Home history error:", err));

    return () => unsub();
  }, [currentUser]);

  // Clean up local guest history items that do not match existing dramas
  useEffect(() => {
    if (!currentUser?.isGuest || dramas.length === 0) return;
    try {
      const key = `history_${currentUser.uid}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        const valid = parsed.filter((item: any) => dramas.some(d => d.id === item.dramaId || d.id === item.id));
        if (valid.length !== parsed.length) {
          localStorage.setItem(key, JSON.stringify(valid));
          setHomeHistory(valid);
        }
      }
    } catch (e) {}
  }, [currentUser, dramas]);

  const resolvedHomeHistory = useMemo(() => {
    return homeHistory
      .map((item) => {
        const liveEp = dramas.find(d => d.id === item.dramaId || d.id === item.id);
        if (!liveEp) return null;
        const liveSeries = seriesList.find(s => s.id === liveEp.seriesId || (liveEp.seriesName && s.name === liveEp.seriesName));
        const latestThumb = liveEp.thumbnailUrl || liveSeries?.thumbnailUrl || item.thumbnailUrl;
        return {
          ...item,
          liveEp,
          seriesId: liveEp.seriesId || liveSeries?.id,
          seriesName: liveEp.seriesName || liveSeries?.name || liveEp.title,
          episodeNumber: liveEp.episodeNumber || item.episodeNumber || 1,
          thumbnailUrl: latestThumb
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [homeHistory, dramas, seriesList]);

  const filteredSeries = useMemo(() => {
    if (selectedGenreFilter === 'All') return seriesList;
    return seriesList.filter(s => s.category && s.category.toLowerCase() === selectedGenreFilter.toLowerCase());
  }, [seriesList, selectedGenreFilter]);

  const featuredSeriesList = useMemo(() => {
    return filteredSeries.length > 0 ? filteredSeries.slice(0, 4) : seriesList.slice(0, 4);
  }, [filteredSeries, seriesList]);

  const trendingSeries = useMemo(() => {
    return seriesList.slice(0, 6);
  }, [seriesList]);

  const newReleasesSeries = useMemo(() => {
    return seriesList.slice(1, 6);
  }, [seriesList]);

  const romanceSeries = useMemo(() => {
    const matched = seriesList.filter(s => s.category?.toLowerCase().includes('romance') || s.category?.toLowerCase().includes('drama'));
    return matched.length > 0 ? matched : seriesList;
  }, [seriesList]);

  if (loading) {
    return (
      <View style={tw`flex-1 bg-black items-center justify-center`}>
        <ActivityIndicator size="large" color="#dc2626" />
        <Text style={tw`text-neutral-400 text-sm font-semibold mt-4`}>Loading Story Rush catalog...</Text>
      </View>
    );
  }

  // If no specific episode (activeCategory) is selected, show Premium Kuku TV Short Drama Catalog
  if (!activeCategory) {
    return (
      <View style={tw`flex-1 bg-black`}>
        {/* Top Kuku TV Branding Header */}
        <View style={tw`px-4 py-3 bg-neutral-950/95 border-b border-neutral-900/80 flex-row items-center justify-between z-20`}>
          <View style={tw`flex-row items-center gap-2`}>
            <View style={tw`w-8 h-8 rounded-xl bg-red-600 items-center justify-center shadow-lg`}>
              <Tv size={18} color="#ffffff" />
            </View>
            <View>
              <View style={tw`flex-row items-center gap-1`}>
                <Text style={tw`text-red-600 font-black tracking-wider text-base`}>STORY</Text>
                <Text style={tw`text-white font-black tracking-wider text-base`}>RUSH</Text>
              </View>
              <Text style={tw`text-[9px] text-neutral-400 font-extrabold uppercase tracking-widest -mt-1`}>Short Dramas</Text>
            </View>
          </View>

          <TouchableOpacity 
            onPress={onPremiumNav}
            style={tw`flex-row items-center bg-gradient-to-r from-red-600 to-amber-500 px-3.5 py-1.5 rounded-full shadow-lg border border-amber-400/30`}
          >
            <Award size={13} color="#ffffff" style={tw`mr-1.5`} />
            <Text style={tw`text-white font-black text-[10px] uppercase tracking-wider`}>VIP Pass</Text>
          </TouchableOpacity>
        </View>

        {/* Scrollable Kuku TV Catalog */}
        <ScrollView 
          style={tw`flex-1`}
          contentContainerStyle={tw`pb-28`}
          showsVerticalScrollIndicator={false}
        >
          {/* Genre Filter Pills */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw`px-4 py-3 gap-2`}
          >
            {['All', 'Romance', 'Action', 'Horror', 'Comedy', 'Thriller'].map((genre) => {
              const isActive = selectedGenreFilter === genre;
              return (
                <TouchableOpacity
                  key={genre}
                  onPress={() => setSelectedGenreFilter(genre)}
                  style={tw`px-4 py-1.5 rounded-full ${
                    isActive 
                      ? 'bg-red-600 border border-red-500' 
                      : 'bg-neutral-900 border border-neutral-800'
                  }`}
                >
                  <Text style={tw`text-xs font-black ${isActive ? 'text-white' : 'text-neutral-400'}`}>
                    {genre}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* 1. Large Featured Banner Carousel */}
          {featuredSeriesList.length > 0 && (
            <View style={tw`mb-6`}>
              <ScrollView 
                horizontal 
                pagingEnabled={false} 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={tw`px-4 gap-3.5`}
              >
                {featuredSeriesList.map((series, idx) => {
                  const firstEp = series.episodes[0];
                  return (
                    <TouchableOpacity
                      key={series.id}
                      activeOpacity={0.9}
                      onPress={() => {
                        if (onOpenSeries) {
                          onOpenSeries(series.id, series.name);
                        }
                      }}
                      style={tw`w-[310px] rounded-3xl overflow-hidden bg-neutral-900 border border-neutral-800/80 shadow-2xl relative`}
                    >
                      <View style={tw`h-88 w-full relative bg-neutral-950`}>
                        <Image 
                          source={{ uri: series.thumbnailUrl }} 
                          style={tw`w-full h-full`}
                          resizeMode="cover"
                        />
                        {/* Dark Vignette Overlay */}
                        <View style={tw`absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent`} />

                        {/* Top Badges */}
                        <View style={tw`absolute top-3 left-3 flex-row items-center gap-1.5`}>
                          <View style={tw`bg-red-600 px-2.5 py-1 rounded-full flex-row items-center gap-1 border border-red-400`}>
                            <Flame size={10} color="#ffffff" fill="#ffffff" />
                            <Text style={tw`text-white text-[9px] font-black uppercase tracking-wider`}>MUST WATCH</Text>
                          </View>
                          <View style={tw`bg-black/70 border border-neutral-700/80 px-2 py-1 rounded-full`}>
                            <Text style={tw`text-amber-400 text-[9px] font-extrabold uppercase`}>{series.category}</Text>
                          </View>
                        </View>

                        {/* Banner Details Overlay */}
                        <View style={tw`absolute bottom-4 left-4 right-4 gap-2`}>
                          <Text style={tw`text-xl font-black text-white tracking-wide leading-tight`} numberOfLines={1}>
                            {series.name}
                          </Text>
                          <Text style={tw`text-[11px] text-neutral-300 leading-snug`} numberOfLines={2}>
                            {series.description}
                          </Text>

                          <View style={tw`flex-row items-center gap-2 mt-1`}>
                            <TouchableOpacity 
                              onPress={() => {
                                if (firstEp) {
                                  onOpenSeries ? onOpenSeries(series.id, series.name) : null;
                                }
                              }}
                              style={tw`flex-1 bg-red-600 py-2.5 rounded-xl flex-row items-center justify-center gap-1.5 shadow-md`}
                            >
                              <Play size={14} color="#ffffff" fill="#ffffff" />
                              <Text style={tw`text-white font-black text-[11px] uppercase tracking-wider`}>Watch Ep. 1</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                              onPress={() => {
                                if (onOpenSeries) onOpenSeries(series.id, series.name);
                              }}
                              style={tw`bg-neutral-800/90 border border-neutral-700 px-3 py-2.5 rounded-xl`}
                            >
                              <Text style={tw`text-neutral-200 font-extrabold text-[10px] uppercase`}>Detail</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* 2. Continue Watching Row */}
          <View style={tw`mb-6`}>
            <View style={tw`px-4 flex-row items-center justify-between mb-3`}>
              <View style={tw`flex-row items-center gap-2`}>
                <Clock size={16} color="#ef4444" />
                <Text style={tw`text-xs font-black text-white uppercase tracking-wider`}>Continue Watching</Text>
              </View>
            </View>

            {resolvedHomeHistory.length === 0 ? (
              <View style={tw`px-4`}>
                <View style={tw`bg-neutral-900/40 border border-neutral-800/80 p-4 rounded-2xl items-center justify-center flex-row gap-2.5`}>
                  <Clock size={16} color="#525252" />
                  <Text style={tw`text-xs font-semibold text-neutral-500`}>No continue watching yet</Text>
                </View>
              </View>
            ) : (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={tw`px-4 gap-3`}
              >
                {resolvedHomeHistory.slice(0, 6).map((item) => (
                  <TouchableOpacity
                    key={item.id || item.dramaId}
                    activeOpacity={0.8}
                    onPress={() => {
                      if (onOpenSeries && (item.seriesId || item.liveEp?.seriesId)) {
                        onOpenSeries(item.seriesId || item.liveEp.seriesId, item.seriesName || 'Series');
                      }
                    }}
                    style={tw`w-[130px] rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800/80`}
                  >
                    <View style={tw`w-full h-36 relative bg-neutral-950`}>
                      <Image 
                        source={{ uri: item.thumbnailUrl }} 
                        style={tw`w-full h-full`}
                        resizeMode="cover"
                      />
                      <View style={tw`absolute inset-0 bg-black/40 items-center justify-center`}>
                        <View style={tw`w-8 h-8 rounded-full bg-red-600/90 items-center justify-center shadow-md`}>
                          <Play size={12} color="#ffffff" fill="#ffffff" style={tw`ml-0.5`} />
                        </View>
                      </View>
                      {/* Ep tag */}
                      <View style={tw`absolute top-1.5 left-1.5 bg-black/80 px-1.5 py-0.5 rounded`}>
                        <Text style={tw`text-[8px] font-mono text-red-500 font-bold`}>EP {item.episodeNumber || 1}</Text>
                      </View>
                    </View>

                    <View style={tw`p-2`}>
                      <Text style={tw`text-[11px] font-bold text-white`} numberOfLines={1}>
                        {item.seriesName || 'Short Drama'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* 3. Trending Now Row */}
          <View style={tw`mb-6`}>
            <View style={tw`px-4 flex-row items-center justify-between mb-3`}>
              <View style={tw`flex-row items-center gap-2`}>
                <TrendingUp size={16} color="#ef4444" />
                <Text style={tw`text-xs font-black text-white uppercase tracking-wider`}>Trending Now</Text>
              </View>
              <Text style={tw`text-[10px] text-red-500 font-extrabold uppercase`}>Top Ranked</Text>
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={tw`px-4 gap-3`}
            >
              {trendingSeries.map((series, idx) => (
                <TouchableOpacity
                  key={series.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (onOpenSeries) {
                      onOpenSeries(series.id, series.name);
                    }
                  }}
                  style={tw`w-[135px] rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800/80 relative`}
                >
                  <View style={tw`w-full h-44 relative bg-neutral-950`}>
                    <Image 
                      source={{ uri: series.thumbnailUrl }} 
                      style={tw`w-full h-full`}
                      resizeMode="cover"
                    />
                    <View style={tw`absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent`} />

                    {/* Rank Badge #1, #2, #3 */}
                    <View style={tw`absolute top-2 left-2 bg-red-600 px-2 py-0.5 rounded-lg border border-red-400 shadow-md`}>
                      <Text style={tw`text-white text-[10px] font-black italic`}>#{idx + 1}</Text>
                    </View>

                    {/* Title overlay */}
                    <View style={tw`absolute bottom-2 left-2 right-2`}>
                      <Text style={tw`text-xs font-black text-white leading-snug`} numberOfLines={1}>
                        {series.name}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* 4. New Releases Row */}
          <View style={tw`mb-6`}>
            <View style={tw`px-4 flex-row items-center justify-between mb-3`}>
              <View style={tw`flex-row items-center gap-2`}>
                <Sparkles size={16} color="#f59e0b" />
                <Text style={tw`text-xs font-black text-white uppercase tracking-wider`}>New Releases</Text>
              </View>
              <Text style={tw`text-[10px] text-amber-400 font-extrabold uppercase`}>Fresh Drop</Text>
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={tw`px-4 gap-3`}
            >
              {newReleasesSeries.map((series) => (
                <TouchableOpacity
                  key={series.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (onOpenSeries) {
                      onOpenSeries(series.id, series.name);
                    }
                  }}
                  style={tw`w-[135px] rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800/80 relative`}
                >
                  <View style={tw`w-full h-44 relative bg-neutral-950`}>
                    <Image 
                      source={{ uri: series.thumbnailUrl }} 
                      style={tw`w-full h-full`}
                      resizeMode="cover"
                    />
                    <View style={tw`absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent`} />

                    {/* NEW Badge */}
                    <View style={tw`absolute top-2 left-2 bg-amber-500 px-2 py-0.5 rounded-lg border border-amber-400 shadow-md`}>
                      <Text style={tw`text-black text-[9px] font-black uppercase`}>NEW</Text>
                    </View>

                    {/* Title overlay */}
                    <View style={tw`absolute bottom-2 left-2 right-2`}>
                      <Text style={tw`text-xs font-black text-white leading-snug`} numberOfLines={1}>
                        {series.name}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* 5. Popular Romance Row */}
          <View style={tw`mb-6`}>
            <View style={tw`px-4 flex-row items-center justify-between mb-3`}>
              <View style={tw`flex-row items-center gap-2`}>
                <Heart size={16} color="#ec4899" fill="#ec4899" />
                <Text style={tw`text-xs font-black text-white uppercase tracking-wider`}>Popular Romance</Text>
              </View>
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={tw`px-4 gap-3`}
            >
              {romanceSeries.map((series) => (
                <TouchableOpacity
                  key={series.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (onOpenSeries) {
                      onOpenSeries(series.id, series.name);
                    }
                  }}
                  style={tw`w-[135px] rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800/80 relative`}
                >
                  <View style={tw`w-full h-44 relative bg-neutral-950`}>
                    <Image 
                      source={{ uri: series.thumbnailUrl }} 
                      style={tw`w-full h-full`}
                      resizeMode="cover"
                    />
                    <View style={tw`absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent`} />

                    {/* Title overlay */}
                    <View style={tw`absolute bottom-2 left-2 right-2`}>
                      <Text style={tw`text-xs font-black text-white leading-snug`} numberOfLines={1}>
                        {series.name}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* 6. All Series Poster Grid */}
          <View style={tw`px-4 mb-3 flex-row items-center justify-between`}>
            <Text style={tw`text-xs font-black text-white uppercase tracking-wider`}>
              All Series ({filteredSeries.length})
            </Text>
          </View>

          <View style={tw`px-4 flex-row flex-wrap justify-between gap-y-4`}>
            {filteredSeries.map((s) => (
              <TouchableOpacity
                key={s.id}
                activeOpacity={0.8}
                onPress={() => {
                  if (onOpenSeries) {
                    onOpenSeries(s.id, s.name);
                  }
                }}
                style={tw`w-[48%] rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800/80 shadow-lg`}
              >
                <View style={tw`w-full h-56 relative bg-neutral-950`}>
                  <Image 
                    source={{ uri: s.thumbnailUrl }} 
                    style={tw`w-full h-full`}
                    resizeMode="cover"
                  />
                  <View style={tw`absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent`} />

                  <View style={tw`absolute bottom-2.5 left-2.5 right-2.5`}>
                    <Text 
                      style={tw`text-xs font-black text-white leading-snug drop-shadow-md`} 
                      numberOfLines={2}
                    >
                      {s.name}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  if (dramas.length === 0) {
    return (
      <View style={tw`flex-1 bg-black items-center justify-center p-6`}>
        <Sparkles size={48} color="#dc2626" style={tw`mb-4`} />
        <Text style={tw`text-lg font-bold text-white mb-2`}>No Dramas Available</Text>
        <Text style={tw`text-xs text-neutral-400 text-center max-w-[280px] leading-relaxed mb-6`}>
          There are no episodes loaded in this category yet. Admins can upload vertical drama episodes using the Admin Console!
        </Text>
      </View>
    );
  }

  return (
    <View onLayout={onLayout} style={tw`flex-1 bg-black relative`}>
      {/* Absolute Header Overlay */}
      <View style={tw`absolute top-4 left-0 right-0 px-5 flex-row items-center justify-between z-30`}>
        <View style={tw`flex-row items-center`}>
          {onClearActiveCategory && (
            <TouchableOpacity 
              onPress={onClearActiveCategory}
              style={tw`flex-row items-center bg-black/70 border border-neutral-700 px-2.5 py-1.5 rounded-full mr-2 z-40`}
            >
              <ArrowLeft size={12} color="#ffffff" style={tw`mr-1`} />
              <Text style={tw`text-white font-extrabold text-[9px] uppercase tracking-wider`}>Back to Series</Text>
            </TouchableOpacity>
          )}
          <Text style={tw`text-red-600 font-black tracking-wider text-sm mr-1`}>STORY</Text>
          <Text style={tw`text-white font-bold text-sm`}>RUSH</Text>
        </View>

        {/* Premium badge */}
        <TouchableOpacity 
          onPress={onPremiumNav}
          style={tw`flex-row items-center bg-gradient-to-r from-red-600 to-amber-500 px-3 py-1.5 rounded-full`}
        >
          <Award size={12} color="#ffffff" style={tw`mr-1.5`} />
          <Text style={tw`text-white font-extrabold text-[10px] uppercase`}>Go Premium</Text>
        </TouchableOpacity>
      </View>

      {/* Swipeable FlatList Feed */}
      <FlatList
        ref={flatListRef}
        data={dramas}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 75 }}
        keyExtractor={(item) => item.id}
        style={tw`flex-1`}
        getItemLayout={(data, index) => ({
          length: itemHeight,
          offset: itemHeight * index,
          index,
        })}
        renderItem={({ item, index }) => {
          const isCurrent = index === activeIndex;
          const liked = likedMap[item.id];
          const favorited = favoriteMap[item.id];
          const creatorId = item.creator || 'storyrush_creator';
          const followed = followedMap[creatorId];

          const isUserPremium = !!userProfile?.isPremium;

          return (
            <DramaCardItem
              item={item}
              index={index}
              isCurrent={isCurrent}
              activeIndex={activeIndex}
              itemHeight={itemHeight}
              liked={!!liked}
              favorited={!!favorited}
              followed={!!followed}
              isMuted={isMuted}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              toggleMute={toggleMute}
              handleFollow={handleFollow}
              handleLike={handleLike}
              handleFavorite={handleFavorite}
              handleShare={handleShare}
              openComments={openComments}
              onOpenSeries={onOpenSeries}
              videoRefs={videoRefs}
              onVideoError={handleVideoError}
              onVideoFinished={handleVideoFinished}
              isLastVideo={index === dramas.length - 1}
              isUserPremium={isUserPremium}
              onPremiumNav={onPremiumNav}
            />
          );
        }}
      />

      {/* Volume Toast Notification Overlay */}
      {showVolumeToast && (
        <View style={tw`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/70 px-4 py-3 rounded-2xl flex-row items-center z-50`}>
          {isMuted ? <VolumeX size={18} color="#ef4444" style={tw`mr-2`} /> : <Volume2 size={18} color="#ffffff" style={tw`mr-2`} />}
          <Text style={tw`text-white font-bold text-xs`}>{isMuted ? 'Muted' : 'Sound On'}</Text>
        </View>
      )}

      {/* Native Comments Modal Sheet Drawer - Custom absolute positioned View overlay to prevent React Portals and touch responder bugs */}
      {showComments && (
        <View style={tw`absolute inset-0 bg-black/50 justify-end z-40`}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'web' ? undefined : (Platform.OS === 'ios' ? 'padding' : 'height')}
            style={[tw`flex-1 justify-end`, Platform.OS === 'web' && { height: '100%', width: '100%' }]}
          >
            <View style={[
              tw`bg-neutral-900 rounded-t-3xl px-4 pt-4 pb-0 relative`,
              { 
                height: Platform.OS === 'web' ? '60dvh' : '60%',
                minHeight: 420,
                marginBottom: 64, 
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }
            ]}>
              {/* Header */}
              <View style={tw`flex-row items-center justify-between pb-3 border-b border-neutral-800`}>
                <View style={tw`flex-row items-center gap-2`}>
                  <Text style={tw`text-white font-bold text-sm`}>Comments ({comments.length})</Text>
                  {loadingComments && <ActivityIndicator size="small" color="#ef4444" />}
                </View>
                <TouchableOpacity onPress={closeComments} style={tw`p-1`}>
                  <X size={20} color="#a3a3a3" />
                </TouchableOpacity>
              </View>

              {/* Visual Toast Notification inside Comment Drawer */}
              {commentToast && (
                <View style={tw`absolute top-16 left-4 right-4 ${commentToast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'} px-4 py-2.5 rounded-xl flex-row items-center justify-between z-50 shadow-lg`}>
                  <Text style={tw`text-white text-xs font-bold`}>{commentToast.message}</Text>
                  <TouchableOpacity onPress={() => setCommentToast(null)}>
                    <X size={14} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              )}

              {commentsError ? (
                <View style={tw`flex-1 items-center justify-center py-8`}>
                  <Text style={tw`text-red-500 text-xs mb-2`}>{commentsError}</Text>
                  <TouchableOpacity onPress={() => dramas[activeIndex] && openComments(dramas[activeIndex])} style={tw`bg-neutral-800 px-3 py-1.5 rounded-lg`}>
                    <Text style={tw`text-white text-xs`}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Standard Flex Column child list container */
                <FlatList
                  data={comments.filter(c => !c.parentId)}
                  keyExtractor={(item) => item.id}
                  style={tw`flex-1 mt-3`}
                  renderItem={({ item }) => (
                    <View style={tw`py-3 border-b border-neutral-800/40`}>
                      <View style={tw`flex-row gap-3`}>
                        <Image
                          source={{ uri: item.userPhoto || `https://api.dicebear.com/7.x/bottts/svg?seed=${item.userId}` }}
                          style={tw`w-8 h-8 rounded-full bg-neutral-800 border border-white/10`}
                        />
                        <View style={tw`flex-1`}>
                          <View style={tw`flex-row items-center gap-2 mb-0.5`}>
                            <Text style={tw`text-neutral-300 text-xs font-bold`}>{item.userName}</Text>
                            <Text style={tw`text-neutral-500 text-[10px]`}>{formatTimeAgo(item.createdAt)}</Text>
                          </View>
                          <Text style={tw`text-white text-xs leading-relaxed`}>{item.text}</Text>
                          
                          {/* Actions Row */}
                          <View style={tw`flex-row items-center gap-4 mt-2`}>
                            {/* Like button */}
                            <TouchableOpacity 
                              onPress={() => handleLikeComment(item)} 
                              style={tw`flex-row items-center gap-1`}
                            >
                              <Heart 
                                size={12} 
                                color={item.likes?.includes(currentUser?.uid || '') ? '#ef4444' : '#a3a3a3'} 
                                fill={item.likes?.includes(currentUser?.uid || '') ? '#ef4444' : 'transparent'}
                              />
                              <Text style={tw`text-[11px] font-medium ${item.likes?.includes(currentUser?.uid || '') ? 'text-red-500' : 'text-neutral-400'}`}>
                                {item.likes?.length || 0}
                              </Text>
                            </TouchableOpacity>

                            {/* Reply button */}
                            <TouchableOpacity 
                              onPress={() => handleStartReply(item)} 
                              style={tw`flex-row items-center gap-1`}
                            >
                              <MessageCircle size={12} color="#a3a3a3" />
                              <Text style={tw`text-[11px] text-neutral-400 font-medium`}>Reply</Text>
                            </TouchableOpacity>

                            {/* Edit / Delete actions for owner */}
                            {currentUser && currentUser.uid === item.userId && (
                              <View style={tw`flex-row gap-3 ml-auto`}>
                                <TouchableOpacity onPress={() => handleStartEdit(item)}>
                                  <Text style={tw`text-[10px] text-amber-500 font-medium`}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDeleteComment(item)}>
                                  <Text style={tw`text-[10px] text-red-500 font-medium`}>Delete</Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>

                      {/* Nested Replies */}
                      {comments.filter(reply => reply.parentId === item.id).length > 0 && (
                        <View style={tw`mt-3 ml-8 pl-3 border-l-2 border-neutral-800/60 gap-3`}>
                          {comments
                            .filter(reply => reply.parentId === item.id)
                            .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
                            .map((reply) => (
                              <View key={reply.id} style={tw`flex-row gap-2.5`}>
                                <Image
                                  source={{ uri: reply.userPhoto || `https://api.dicebear.com/7.x/bottts/svg?seed=${reply.userId}` }}
                                  style={tw`w-6 h-6 rounded-full bg-neutral-800 border border-white/10`}
                                />
                                <View style={tw`flex-1`}>
                                  <View style={tw`flex-row items-center gap-2 mb-0.5`}>
                                    <Text style={tw`text-neutral-300 text-[11px] font-semibold`}>{reply.userName}</Text>
                                    <Text style={tw`text-neutral-500 text-[9px]`}>{formatTimeAgo(reply.createdAt)}</Text>
                                  </View>
                                  <Text style={tw`text-neutral-200 text-xs leading-relaxed`}>{reply.text}</Text>

                                  {/* Actions Row for Reply */}
                                  <View style={tw`flex-row items-center gap-4 mt-1.5`}>
                                    {/* Like reply button */}
                                    <TouchableOpacity 
                                      onPress={() => handleLikeComment(reply)} 
                                      style={tw`flex-row items-center gap-1`}
                                    >
                                      <Heart 
                                        size={10} 
                                        color={reply.likes?.includes(currentUser?.uid || '') ? '#ef4444' : '#a3a3a3'} 
                                        fill={reply.likes?.includes(currentUser?.uid || '') ? '#ef4444' : 'transparent'}
                                      />
                                      <Text style={tw`text-[10px] ${reply.likes?.includes(currentUser?.uid || '') ? 'text-red-500' : 'text-neutral-400'}`}>
                                        {reply.likes?.length || 0}
                                      </Text>
                                    </TouchableOpacity>

                                    {/* Edit/Delete for reply owner */}
                                    {currentUser && currentUser.uid === reply.userId && (
                                      <View style={tw`flex-row gap-2.5 ml-auto`}>
                                        <TouchableOpacity onPress={() => handleStartEdit(reply)}>
                                          <Text style={tw`text-[9px] text-amber-500 font-medium`}>Edit</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleDeleteComment(reply)}>
                                          <Text style={tw`text-[9px] text-red-500 font-medium`}>Delete</Text>
                                        </TouchableOpacity>
                                      </View>
                                    )}
                                  </View>
                                </View>
                              </View>
                            ))
                          }
                        </View>
                      )}
                    </View>
                  )}
                  ListEmptyComponent={
                    <View style={tw`items-center justify-center py-12`}>
                      <MessageCircle size={32} color="#404040" style={tw`mb-2`} />
                      <Text style={tw`text-neutral-500 text-xs font-medium`}>
                        {loadingComments ? 'Loading comments...' : 'Be the first to leave a comment!'}
                      </Text>
                    </View>
                  }
                />
              )}

              {/* Editing / Replying Mode Indicators (Flex Column Flow above Composer) */}
              {(editingComment || replyingToComment) && (
                <View style={tw`flex-row items-center justify-between px-3 py-1.5 bg-neutral-800 border-t border-neutral-700 w-full`}>
                  <Text style={tw`text-amber-500 text-[10px] font-semibold`}>
                    {editingComment ? 'Editing comment...' : `Replying to @${replyingToComment?.userName}...`}
                  </Text>
                  <TouchableOpacity onPress={() => { setEditingComment(null); setReplyingToComment(null); setNewCommentText(''); }}>
                    <X size={12} color="#f59e0b" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Input Footer (Flex Column Flow at the bottom of the drawer layout) */}
              <View style={tw`flex-row gap-2.5 items-center bg-neutral-900 border-t border-neutral-800 px-4 py-3 w-full`}>
                <TextInput
                  placeholder={replyingToComment ? "Write a reply..." : editingComment ? "Edit your comment..." : "Write a comment..."}
                  placeholderTextColor="#737373"
                  value={newCommentText}
                  onChangeText={setNewCommentText}
                  style={tw`flex-1 bg-neutral-950 border border-neutral-800 text-white text-xs px-4 py-3 rounded-xl`}
                />
                <TouchableOpacity 
                  onPress={handleAddComment} 
                  disabled={sendingComment || !newCommentText.trim()}
                  style={tw`w-11 h-11 bg-red-600 rounded-xl items-center justify-center ${!newCommentText.trim() ? 'opacity-50' : ''}`}
                >
                  {sendingComment ? <ActivityIndicator size="small" color="#ffffff" /> : <Send size={16} color="#ffffff" />}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* Sleek Delete Confirmation Overlay - Custom absolute positioned View to prevent React Portals and touch responder bugs */}
      {commentToDelete && (
        <View style={tw`absolute inset-0 bg-black/80 items-center justify-center p-6 z-50`}>
          <View style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl p-6 w-full max-w-xs items-center gap-4 shadow-2xl`}>
            <View style={tw`w-12 h-12 rounded-full bg-red-600/10 items-center justify-center`}>
              <Trash2 size={24} color="#ef4444" />
            </View>
            <View style={tw`items-center`}>
              <Text style={tw`text-white font-bold text-sm text-center mb-1`}>Delete Comment?</Text>
              <Text style={tw`text-neutral-400 text-xs text-center leading-relaxed px-2`}>
                Are you sure you want to permanently delete this comment? This action cannot be undone.
              </Text>
            </View>
            <View style={tw`flex-row gap-3 w-full mt-2`}>
              <TouchableOpacity 
                onPress={() => setCommentToDelete(null)}
                style={tw`flex-1 bg-neutral-800 py-3 rounded-xl items-center`}
              >
                <Text style={tw`text-neutral-300 text-xs font-bold`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => handleDeleteCommentConfirm(commentToDelete)}
                style={tw`flex-1 bg-red-600 py-3 rounded-xl items-center`}
              >
                <Text style={tw`text-white text-xs font-bold`}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
