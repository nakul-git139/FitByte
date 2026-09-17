import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Theme } from '../config/theme';

export interface ExerciseVideoPlayerProps {
  source?: any;
  hasDemoVideo?: boolean;
  exerciseName?: string;
  autoPlay?: boolean;
  loop?: boolean;
  showCustomControls?: boolean;
  useNativeControls?: boolean;
  style?: ViewStyle;
  onStartExercisePress?: () => void;
}

export const ExerciseVideoPlayer: React.FC<ExerciseVideoPlayerProps> = ({
  source,
  hasDemoVideo = true,
  exerciseName = 'Exercise',
  autoPlay = true,
  loop = true,
  showCustomControls = true,
  useNativeControls = false,
  style,
  onStartExercisePress,
}) => {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoViewRef = useRef<VideoView>(null);

  // Initialize expo-video player
  const player = useVideoPlayer(source || null, (p) => {
    p.loop = loop;
    p.muted = true;
    if (autoPlay && source) {
      p.play();
    }
  });

  useEffect(() => {
    if (!player || !source) {
      setIsLoading(false);
      return;
    }

    // Set loop option
    player.loop = loop;

    const statusListener = (statusPayload: any) => {
      if (statusPayload.status === 'error') {
        setHasError(true);
        setErrorMessage(statusPayload.error?.message || 'Failed to load video');
        setIsLoading(false);
      } else if (statusPayload.status === 'readyToPlay') {
        setIsLoading(false);
        setHasError(false);
        setDuration(player.duration || 0);
      } else if (statusPayload.status === 'loading') {
        setIsLoading(true);
      }
    };

    const playingChangeListener = (event: any) => {
      setIsPlaying(event.isPlaying);
    };

    const timeUpdateListener = (event: any) => {
      setCurrentTime(event.currentTime || 0);
      if (player.duration) {
        setDuration(player.duration);
      }
    };

    // Subscriptions
    const subStatus = player.addListener('statusChange', statusListener);
    const subPlaying = player.addListener('playingChange', playingChangeListener);
    const subTime = player.addListener('timeUpdate', timeUpdateListener);

    return () => {
      subStatus?.remove();
      subPlaying?.remove();
      subTime?.remove();
    };
  }, [player, source, loop]);

  const handleTogglePlay = () => {
    if (!player) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (player.playing) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  };

  const handleRestart = () => {
    if (!player) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    player.currentTime = 0;
    player.play();
    setIsPlaying(true);
  };

  const handleFullscreen = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (videoViewRef.current) {
        videoViewRef.current.enterFullscreen();
      }
    } catch {}
  };

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    if (player && source) {
      try {
        player.replace(source);
        player.play();
      } catch (e) {
        setHasError(true);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Fallback: No demo video available
  if (!hasDemoVideo || !source) {
    return (
      <View style={[styles.container, styles.unavailableContainer, style]}>
        <View style={styles.unavailableIconCircle}>
          <Ionicons name="videocam-off-outline" size={32} color={Theme.colors.textMuted} />
        </View>
        <Text style={styles.unavailableTitle}>Demo video unavailable</Text>
        <Text style={styles.unavailableSubtitle}>
          3D demonstration for {exerciseName} is being prepared. You can still follow the step-by-step instructions below.
        </Text>
        {onStartExercisePress && (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={onStartExercisePress}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Start Exercise</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Error State
  if (hasError) {
    return (
      <View style={[styles.container, styles.errorContainer, style]}>
        <Ionicons name="alert-circle-outline" size={36} color={Theme.colors.error} />
        <Text style={styles.errorTitle}>Unable to play demonstration</Text>
        <Text style={styles.errorSubtitle}>
          {errorMessage || 'There was a problem loading the video demonstration.'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.8}>
          <Ionicons name="reload-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <View style={[styles.container, style]}>
      {/* Video View */}
      <VideoView
        ref={videoViewRef}
        style={styles.videoView}
        player={player}
        contentFit="cover"
        nativeControls={useNativeControls}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Theme.colors.primaryGreen} />
          <Text style={styles.loadingText}>Loading 3D Demo...</Text>
        </View>
      )}

      {/* Custom Control Overlay */}
      {showCustomControls && !useNativeControls && (
        <View style={styles.controlsOverlay}>
          {/* Top Bar: Loop Pill */}
          <View style={styles.topControlRow}>
            <View style={styles.loopBadge}>
              <Ionicons name="repeat" size={13} color="#FFFFFF" />
              <Text style={styles.loopBadgeText}>Looping 3D Demo</Text>
            </View>

            <TouchableOpacity
              style={styles.controlIconBtn}
              onPress={handleFullscreen}
              activeOpacity={0.7}
            >
              <Ionicons name="scan-outline" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Center Play/Pause Touch Area */}
          <TouchableOpacity
            style={styles.centerPlayArea}
            onPress={handleTogglePlay}
            activeOpacity={0.9}
          >
            {!isPlaying && (
              <View style={styles.bigPlayButton}>
                <Ionicons name="play" size={28} color="#FFFFFF" style={{ marginLeft: 3 }} />
              </View>
            )}
          </TouchableOpacity>

          {/* Bottom Bar: Progress & Controls */}
          <View style={styles.bottomControlBar}>
            {/* Progress Track */}
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
            </View>

            <View style={styles.bottomActionsRow}>
              <View style={styles.leftActions}>
                <TouchableOpacity
                  style={styles.smallActionBtn}
                  onPress={handleTogglePlay}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isPlaying ? 'pause' : 'play'}
                    size={16}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.smallActionBtn}
                  onPress={handleRestart}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh" size={16} color="#FFFFFF" />
                </TouchableOpacity>

                <Text style={styles.timeText}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.smallActionBtn}
                onPress={handleFullscreen}
                activeOpacity={0.7}
              >
                <Ionicons name="expand-outline" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 240,
    backgroundColor: '#0F172A',
    borderRadius: Theme.borderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  videoView: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.xs,
    fontWeight: '600',
    marginTop: 8,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    padding: Theme.spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  topControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  loopBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  controlIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  centerPlayArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigPlayButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Theme.colors.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadows.elevated,
  },
  bottomControlBar: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  progressTrack: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Theme.colors.accentGreen,
    borderRadius: 2,
  },
  bottomActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smallActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },
  unavailableContainer: {
    backgroundColor: Theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
  },
  unavailableIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    ...Theme.shadows.soft,
  },
  unavailableTitle: {
    fontSize: Theme.typography.sizes.base,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    marginBottom: 4,
  },
  unavailableSubtitle: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
    maxWidth: 260,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primaryGreen,
    paddingHorizontal: Theme.spacing.base,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.md,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: Theme.colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.error,
  },
  errorTitle: {
    fontSize: Theme.typography.sizes.base,
    fontWeight: '700',
    color: Theme.colors.error,
    marginTop: 8,
    marginBottom: 4,
  },
  errorSubtitle: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
    maxWidth: 260,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.error,
    paddingHorizontal: Theme.spacing.base,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.md,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.xs,
    fontWeight: '600',
  },
});
