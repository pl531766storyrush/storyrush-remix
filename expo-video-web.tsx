import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';

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

export const Video = forwardRef<any, VideoProps>((props, ref) => {
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

  // Expose the playback functions expected by components
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

  // Synchronize props changes with the actual video state
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

  // Determine objectFit style based on ResizeMode or contentFit
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

  // Video element event handlers
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
        positionMillis: (videoRef.current.currentTime || 0) * 1000,
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

export const VideoView = Video;

export function useVideoPlayer(source: any, setup?: (player: any) => void) {
  const [player] = useState(() => ({
    playing: false,
    muted: false,
    loop: false,
    currentTime: 0,
    duration: 0,
    play: () => {},
    pause: () => {},
    seekBy: () => {},
    addListener: () => ({ remove: () => {} }),
  }));

  useEffect(() => {
    if (setup) {
      setup(player);
    }
  }, [player, setup]);

  return player;
}

export function createVideoPlayer(source: any) {
  return {
    playing: false,
    muted: false,
    loop: false,
    currentTime: 0,
    duration: 0,
    play: () => {},
    pause: () => {},
    seekBy: () => {},
    addListener: () => ({ remove: () => {} }),
  };
}

export default {
  Video,
  VideoView,
  useVideoPlayer,
  createVideoPlayer,
  ResizeMode,
};
