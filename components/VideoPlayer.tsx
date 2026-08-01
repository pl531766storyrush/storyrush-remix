import React, { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { Platform, View } from 'react-native';

export enum ResizeMode {
  CONTAIN = 'contain',
  COVER = 'cover',
  STRETCH = 'stretch',
}

export type VideoContentFit = 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';

export interface VideoProps {
  source: { uri: string } | string | any;
  resizeMode?: ResizeMode | string;
  contentFit?: VideoContentFit | string;
  shouldPlay?: boolean;
  isLooping?: boolean;
  isMuted?: boolean;
  style?: any;
  nativeControls?: boolean;
  useNativeControls?: boolean;
  playsInline?: boolean;
  onPlaybackStatusUpdate?: (status: any) => void;
  onLoad?: (status: any) => void;
  onReadyForDisplay?: () => void;
  onError?: (error: any) => void;
  player?: any;
}

// Safely require native expo-video module if running on Android/iOS native
let NativeVideoView: any = null;
let nativeUseVideoPlayer: any = null;

if (Platform.OS !== 'web') {
  try {
    const expoVideo = require('expo-video');
    NativeVideoView = expoVideo.VideoView;
    nativeUseVideoPlayer = expoVideo.useVideoPlayer;
  } catch (e) {
    console.warn('[VideoPlayer] Native expo-video module not available:', e);
  }
}

// Native Android / iOS Video Component
const NativeVideo = forwardRef<any, VideoProps>((props, ref) => {
  const {
    source,
    resizeMode,
    contentFit,
    shouldPlay,
    isLooping,
    isMuted,
    style,
    onLoad,
    onReadyForDisplay,
    onError,
  } = props;

  const videoUri = typeof source === 'object' && source !== null ? source.uri : source;
  const safeSource = (typeof videoUri === 'string' && videoUri.trim().length > 0) ? videoUri.trim() : null;

  // Unconditionally call nativeUseVideoPlayer hook if available, passing safeSource
  const player = nativeUseVideoPlayer ? nativeUseVideoPlayer(safeSource, (p: any) => {
    if (p) {
      p.loop = !!isLooping;
      p.muted = !!isMuted;
      if (shouldPlay) {
        try { p.play(); } catch (e) {}
      }
    }
  }) : null;

  useEffect(() => {
    if (!player) return;
    try {
      if (shouldPlay) {
        player.play();
      } else {
        player.pause();
      }
    } catch (e) {}
  }, [player, shouldPlay]);

  useEffect(() => {
    if (!player) return;
    try {
      player.loop = !!isLooping;
    } catch (e) {}
  }, [player, isLooping]);

  useEffect(() => {
    if (!player) return;
    try {
      player.muted = !!isMuted;
    } catch (e) {}
  }, [player, isMuted]);

  useImperativeHandle(ref, () => ({
    playAsync: async () => { try { player?.play(); } catch (e) {} },
    pauseAsync: async () => { try { player?.pause(); } catch (e) {} },
    stopAsync: async () => { try { player?.pause(); } catch (e) {} },
    setPositionAsync: async (millis: number) => {
      try {
        if (player) player.currentTime = millis / 1000;
      } catch (e) {}
    },
  }));

  useEffect(() => {
    if (player) {
      if (onLoad) onLoad({ isLoaded: true, isPlaying: player.playing });
      if (onReadyForDisplay) onReadyForDisplay();
    }
  }, [player]);

  let fit: any = 'cover';
  if (contentFit) {
    fit = contentFit;
  } else if (resizeMode === ResizeMode.CONTAIN || resizeMode === 'contain') {
    fit = 'contain';
  } else if (resizeMode === ResizeMode.STRETCH || resizeMode === 'stretch') {
    fit = 'fill';
  }

  if (!nativeUseVideoPlayer || !NativeVideoView || !player || !safeSource) {
    return <View style={style} />;
  }

  return (
    <NativeVideoView
      style={style}
      player={player}
      contentFit={fit}
      nativeControls={false}
    />
  );
});

// Web Video Component (HTML5 <video>)
const WebVideo = forwardRef<any, VideoProps>((props, ref) => {
  const { 
    source, 
    resizeMode, 
    contentFit,
    shouldPlay, 
    isLooping, 
    isMuted, 
    style,
    onPlaybackStatusUpdate,
    onLoad,
    onReadyForDisplay,
    onError,
  } = props;
  
  const videoRef = useRef<HTMLVideoElement>(null);

  useImperativeHandle(ref, () => ({
    playAsync: async () => {
      if (videoRef.current) {
        try {
          await videoRef.current.play();
        } catch (err) {
          console.warn("playAsync programmatically failed:", err);
        }
      }
    },
    pauseAsync: async () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
    },
    stopAsync: async () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    },
    setPositionAsync: async (positionMillis: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = positionMillis / 1000;
      }
    },
  }));

  useEffect(() => {
    if (!videoRef.current) return;
    if (shouldPlay) {
      videoRef.current.play().catch((err) => {
        console.warn("Video play failed or interrupted:", err);
      });
    } else {
      videoRef.current.pause();
    }
  }, [shouldPlay]);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.loop = !!isLooping;
  }, [isLooping]);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !!isMuted;
  }, [isMuted]);

  let objectFit: 'contain' | 'cover' | 'fill' = 'cover';
  if (contentFit === 'contain' || resizeMode === ResizeMode.CONTAIN || resizeMode === 'contain') {
    objectFit = 'contain';
  } else if (contentFit === 'fill' || resizeMode === ResizeMode.STRETCH || resizeMode === 'stretch') {
    objectFit = 'fill';
  }

  const isDesktopFrame = typeof window !== 'undefined' && window.innerWidth > 480;

  const videoStyle: React.CSSProperties = {
    ...style,
    position: 'absolute',
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    transform: 'translate(-50%, -50%)',
    width: isDesktopFrame ? '100%' : '100vw',
    height: isDesktopFrame ? '100%' : '100dvh',
    objectFit,
  };

  const videoUrl = typeof source === 'object' && source !== null ? source.uri : source;

  const handleCanPlay = () => {
    if (onReadyForDisplay) {
      onReadyForDisplay();
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const status = {
      isLoaded: true,
      isPlaying: !videoRef.current.paused,
      durationMillis: (videoRef.current.duration || 0) * 1000,
      positionMillis: (videoRef.current.currentTime || 0) * 1000,
    };
    if (onLoad) {
      onLoad(status);
    }
    if (onPlaybackStatusUpdate) {
      onPlaybackStatusUpdate(status);
    }
  };

  const handlePlaybackStateChange = () => {
    if (!videoRef.current) return;
    if (onPlaybackStatusUpdate) {
      onPlaybackStatusUpdate({
        isLoaded: true,
        isPlaying: !videoRef.current.paused,
        durationMillis: (videoRef.current.duration || 0) * 1000,
        positionMillis: (videoRef.current.duration || 0) * 1000,
      });
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    if (onPlaybackStatusUpdate) {
      onPlaybackStatusUpdate({
        isLoaded: true,
        isPlaying: !videoRef.current.paused,
        durationMillis: (videoRef.current.duration || 0) * 1000,
        positionMillis: (videoRef.current.currentTime || 0) * 1000,
      });
    }
  };

  const handleVideoError = () => {
    if (!videoRef.current) return;
    const errorMsg = videoRef.current.error?.message || "Error loading video source";
    if (onError) {
      onError({ message: errorMsg });
    }
    if (onPlaybackStatusUpdate) {
      onPlaybackStatusUpdate({
        isLoaded: false,
        error: errorMsg,
      });
    }
  };

  const handleEnded = () => {
    if (!videoRef.current) return;
    if (onPlaybackStatusUpdate) {
      onPlaybackStatusUpdate({
        isLoaded: true,
        isPlaying: false,
        durationMillis: (videoRef.current.duration || 0) * 1000,
        positionMillis: (videoRef.current.duration || 0) * 1000,
        didJustFinish: true,
      });
    }
  };

  return (
    <video
      ref={videoRef}
      src={videoUrl}
      style={videoStyle}
      playsInline
      webkit-playsinline="true"
      muted={isMuted}
      loop={isLooping}
      autoPlay={shouldPlay}
      onCanPlay={handleCanPlay}
      onLoadedMetadata={handleLoadedMetadata}
      onPlay={handlePlaybackStateChange}
      onPause={handlePlaybackStateChange}
      onTimeUpdate={handleTimeUpdate}
      onError={handleVideoError}
      onEnded={handleEnded}
    />
  );
});

export const Video = forwardRef<any, VideoProps>((props, ref) => {
  if (Platform.OS === 'web') {
    return <WebVideo {...props} ref={ref} />;
  }
  return <NativeVideo {...props} ref={ref} />;
});

export default Video;
