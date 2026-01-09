import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid, AVPlaybackStatus } from 'expo-av';
import { downloadAndShareFile, extractFilename, getFileType } from '@/lib/file-download';
import { cacheAsset, getCache, getAssetKey } from '@/lib/cache';

interface AudioPlayerProps {
  audioUrl: string;
  onClose: () => void;
}

export function AudioPlayer({ audioUrl, onClose }: AudioPlayerProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [hasFinished, setHasFinished] = useState(false);

  // Load audio when URL changes
  useEffect(() => {
    loadAudio();
    return () => {
      if (sound) {
        sound.unloadAsync().catch(() => {});
      }
    };
  }, [audioUrl]);

  const loadAudio = async () => {
    try {
      setIsLoading(true);
      
      if (sound) {
        await sound.unloadAsync();
      }

      // Configure audio mode for proper device routing
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        shouldDuckAndroid: true,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        playThroughEarpieceAndroid: false,
      });

      // Try to load from cache first, otherwise cache and load
      let audioSource: string = audioUrl;
      
      // Check if audio is already cached
      const cacheKey = getAssetKey(audioUrl);
      const cached = await getCache<string>(cacheKey);
      
      if (cached && !cached.data.startsWith('http')) {
        // Use cached local file
        console.log('Loading audio from cache:', cached.data);
        audioSource = cached.data;
      } else {
        // Cache the audio file first
        console.log('Caching audio file:', audioUrl);
        audioSource = await cacheAsset(audioUrl);
        console.log('Audio cached, loading from:', audioSource);
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioSource },
        { shouldPlay: false, volume, isMuted },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading audio:', error);
      setIsLoading(false);
    }
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      const pos = status.positionMillis / 1000;
      
      // For streaming audio, durationMillis may be undefined
      // So we capture it when the audio finishes playing
      if (status.durationMillis) {
        setDuration(status.durationMillis / 1000);
      } else if (status.didJustFinish && pos > 0) {
        // When audio finishes, the position is the duration
        setDuration(pos);
      }
      
      setPosition(pos);
      setIsPlaying(status.isPlaying || false);
      
      if (status.didJustFinish) {
        setHasFinished(true);
        setIsPlaying(false);
      }
    }
  };

  const handlePlayPause = async () => {
    if (!sound) return;

    try {
      if (hasFinished) {
        // Replay from beginning
        setHasFinished(false);
        await sound.setPositionAsync(0);
        await sound.playAsync();
      } else if (isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } catch (error) {
      console.error('Error playing/pausing audio:', error);
    }
  };

  const handleClose = async () => {
    try {
      if (sound) {
        await sound.stopAsync().catch(() => {});
        await sound.unloadAsync().catch(() => {});
        setSound(null);
      }
    } catch (error) {
      console.log('Error closing audio player (ignored):', error);
    }
    onClose();
  };

  const handleVolumeChange = async (newVolume: number) => {
    setVolume(newVolume);
    if (sound) {
      try {
        await sound.setVolumeAsync(newVolume);
      } catch (error) {
        console.error('Error setting volume:', error);
      }
    }
  };

  const handleToggleMute = async () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (sound) {
      try {
        await sound.setIsMutedAsync(newMuted);
      } catch (error) {
        console.error('Error toggling mute:', error);
      }
    }
  };

  const handleSeekComplete = async (value: number) => {
    if (!sound || duration === 0) return;
    
    try {
      const seekPosition = value * duration * 1000; // Convert to milliseconds
      await sound.setPositionAsync(seekPosition);
      // Reset finished state when seeking
      if (hasFinished) {
        setHasFinished(false);
      }
    } catch (error) {
      console.error('Error seeking audio:', error);
    }
  };

  const handleDownload = () => {
    const fileType = getFileType(audioUrl);
    if (fileType) {
      downloadAndShareFile({
        url: audioUrl,
        name: extractFilename(audioUrl),
        type: fileType,
      });
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds === 0) return '0:00';
    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const filename = extractFilename(audioUrl);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.filename} numberOfLines={1}>
          🎵 {filename}
        </Text>
        <Pressable style={styles.closeButton} onPress={handleClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.controls}>
        {/* Play/Pause/Replay Button */}
        <Pressable
          style={[styles.controlButton, styles.playButton]}
          onPress={handlePlayPause}
          disabled={isLoading}
        >
          <Text style={styles.controlButtonText}>
            {isLoading ? '...' : hasFinished ? '↻' : isPlaying ? '⏸' : '▶️'}
          </Text>
        </Pressable>

        {/* Time Display with Seekable Progress Bar */}
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <Slider
            style={styles.progressSlider}
            minimumValue={0}
            maximumValue={1}
            value={duration > 0 ? position / duration : 0}
            onSlidingComplete={handleSeekComplete}
            minimumTrackTintColor="#ffffff"
            maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
            thumbTintColor="#ffffff"
            disabled={isLoading || duration === 0}
          />
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>

        {/* Mute Button */}
        <Pressable style={styles.controlButton} onPress={handleToggleMute}>
          <Text style={styles.controlButtonText}>{isMuted ? '🔇' : '🔊'}</Text>
        </Pressable>

        {/* Download Button */}
        <Pressable style={styles.controlButton} onPress={handleDownload}>
          <Text style={styles.controlButtonText}>⬇️</Text>
        </Pressable>
      </View>

      {/* Volume Control */}
      <View style={styles.volumeContainer}>
        <Text style={styles.volumeLabel}>Volume</Text>
        <Slider
          style={styles.volumeSlider}
          minimumValue={0}
          maximumValue={1}
          value={volume}
          onValueChange={handleVolumeChange}
          minimumTrackTintColor="#ffffff"
          maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
          thumbTintColor="#ffffff"
        />
        <Text style={styles.volumeText}>{Math.round(volume * 100)}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e40af',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  filename: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  controlButtonText: {
    fontSize: 20,
  },
  timeContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
  },
  timeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
    minWidth: 40,
  },
  progressSlider: {
    flex: 1,
    height: 40,
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  volumeLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
    minWidth: 50,
  },
  volumeSlider: {
    flex: 1,
    height: 40,
  },
  volumeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
    minWidth: 40,
    textAlign: 'right',
  },
});
