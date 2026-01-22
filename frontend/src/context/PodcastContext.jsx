/**
 * Podcast Context.
 * Manages global audio playback state for the persistent player.
 */

import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import * as podcastApi from '../api/podcast';

const PodcastContext = createContext(null);

export function PodcastProvider({ children }) {
    // Current track info
    const [currentEpisode, setCurrentEpisode] = useState(null);
    const [currentFeed, setCurrentFeed] = useState(null);

    // Playback state
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [playbackRate, setPlaybackRateState] = useState(1);

    // Session tracking
    const [sessionId, setSessionId] = useState(null);
    const [listenedSeconds, setListenedSeconds] = useState(0);
    const lastUpdateRef = useRef(0);

    // Audio element ref
    const audioRef = useRef(null);

    // Initialize audio element
    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.preload = 'metadata';

            audioRef.current.addEventListener('loadedmetadata', () => {
                setDuration(audioRef.current.duration);
                setIsLoading(false);
            });

            audioRef.current.addEventListener('timeupdate', () => {
                const time = audioRef.current.currentTime;
                setCurrentTime(time);

                // Track listened time (update every 5 seconds)
                if (time - lastUpdateRef.current >= 5) {
                    setListenedSeconds(prev => prev + 5);
                    lastUpdateRef.current = time;
                }
            });

            audioRef.current.addEventListener('ended', () => {
                setIsPlaying(false);
            });

            audioRef.current.addEventListener('error', (e) => {
                // Ignore error when src is empty (cleanup triggers this)
                if (!audioRef.current.src || audioRef.current.src === window.location.href) return;
                console.error('Audio error:', e, audioRef.current.error);
                setIsLoading(false);
                setIsPlaying(false);
            });
        }

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
            }
        };
    }, []);

    // Save progress periodically and on pause/unload
    useEffect(() => {
        if (!sessionId) return;

        // Function to save current position
        const savePosition = () => {
            const currentPos = audioRef.current?.currentTime || 0;
            if (currentPos > 0) {
                console.log('[Podcast] Saving position:', currentPos);
                podcastApi.updateListeningSession(
                    sessionId,
                    listenedSeconds,
                    currentPos
                ).catch(console.error);
            }
        };

        // Save on pause
        const handlePause = () => {
            console.log('[Podcast] Paused, saving position');
            savePosition();
        };

        // Save on beforeunload using sendBeacon for reliability
        const handleBeforeUnload = () => {
            const currentPos = audioRef.current?.currentTime || 0;
            if (currentPos > 0) {
                const data = JSON.stringify({
                    session_id: sessionId,
                    listened_seconds: listenedSeconds,
                    position_seconds: currentPos
                });
                navigator.sendBeacon('/api/podcast/session/update-beacon', data);
            }
        };

        // Add listeners
        audioRef.current?.addEventListener('pause', handlePause);
        window.addEventListener('beforeunload', handleBeforeUnload);

        // Also save periodically (every 10 seconds when playing)
        const interval = setInterval(() => {
            if (isPlaying) {
                savePosition();
            }
        }, 10000); // Every 10 seconds

        return () => {
            audioRef.current?.removeEventListener('pause', handlePause);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            clearInterval(interval);
            // Save position on cleanup
            savePosition();
        };
    }, [sessionId, isPlaying, listenedSeconds]);

    // Play an episode
    // startPosition: optional position in seconds to start from (for resume)
    const playEpisode = useCallback(async (episode, feed, startPosition = null) => {
        if (!episode?.audio_url) return;

        setIsLoading(true);

        // End previous session if exists
        if (sessionId && currentEpisode) {
            try {
                await podcastApi.endListeningSession(
                    sessionId,
                    listenedSeconds,
                    audioRef.current?.currentTime || 0
                );
            } catch (e) {
                console.error('Failed to end previous session:', e);
            }
        }

        // Set new episode
        setCurrentEpisode(episode);
        setCurrentFeed(feed);
        setListenedSeconds(0);
        lastUpdateRef.current = 0;

        // Get resume position (use provided startPosition or fetch from API)
        let resumePosition = startPosition;
        if (resumePosition === null) {
            try {
                const { position_seconds } = await podcastApi.getEpisodePosition(episode.id);
                resumePosition = position_seconds || 0;
            } catch (e) {
                console.error('Failed to get position:', e);
                resumePosition = 0;
            }
        }

        const audio = audioRef.current;

        // Define handler for when audio metadata is loaded
        const handleLoaded = async () => {
            console.log('[Podcast] loadedmetadata fired, resumePosition:', resumePosition);

            // Seek to resume position
            if (resumePosition > 0) {
                console.log('[Podcast] Seeking to:', resumePosition);
                audio.currentTime = resumePosition;
                // Wait a tick for seek to complete
                await new Promise(resolve => setTimeout(resolve, 100));
                console.log('[Podcast] After seek, currentTime:', audio.currentTime);
            }

            // Start session
            try {
                const { session_id } = await podcastApi.startListeningSession(episode.id);
                setSessionId(session_id);
            } catch (e) {
                console.error('Failed to start session:', e);
            }

            // Play
            try {
                await audio.play();
                setIsPlaying(true);
                console.log('[Podcast] Playing from:', audio.currentTime);
            } catch (e) {
                console.error('Playback failed:', e);
            }
            setIsLoading(false);
        };

        // CRITICAL: Add listener BEFORE setting src to avoid race condition
        // The loadedmetadata event might fire immediately if audio is cached
        audio.addEventListener('loadedmetadata', handleLoaded, { once: true });

        // Now set the source - this triggers loading
        audio.src = episode.audio_url;
        console.log('[Podcast] Set audio src, resumePosition:', resumePosition);
    }, [sessionId, currentEpisode, listenedSeconds]);

    // Toggle play/pause
    const togglePlayPause = useCallback(() => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play()
                .then(() => setIsPlaying(true))
                .catch(console.error);
        }
    }, [isPlaying]);

    // Seek to position
    const seek = useCallback((seconds) => {
        if (audioRef.current) {
            audioRef.current.currentTime = seconds;
            setCurrentTime(seconds);
        }
    }, []);

    // Skip forward/backward
    const skip = useCallback((seconds) => {
        if (audioRef.current) {
            audioRef.current.currentTime = Math.max(
                0,
                Math.min(audioRef.current.duration, audioRef.current.currentTime + seconds)
            );
        }
    }, []);

    // Set playback rate
    const setPlaybackRate = useCallback((rate) => {
        if (audioRef.current) {
            audioRef.current.playbackRate = rate;
        }
        setPlaybackRateState(rate);
    }, []);

    // Stop and cleanup
    const stop = useCallback(async () => {
        if (sessionId) {
            try {
                await podcastApi.endListeningSession(
                    sessionId,
                    listenedSeconds,
                    audioRef.current?.currentTime || 0
                );
            } catch (e) {
                console.error('Failed to end session:', e);
            }
        }

        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
        }

        setCurrentEpisode(null);
        setCurrentFeed(null);
        setIsPlaying(false);
        setSessionId(null);
        setListenedSeconds(0);
    }, [sessionId, listenedSeconds]);

    const value = {
        // State
        currentEpisode,
        currentFeed,
        isPlaying,
        isLoading,
        currentTime,
        duration,
        listenedSeconds,
        playbackRate,

        // Actions
        playEpisode,
        togglePlayPause,
        seek,
        skip,
        stop,
        setPlaybackRate,
    };

    return (
        <PodcastContext.Provider value={value}>
            {children}
        </PodcastContext.Provider>
    );
}

export function usePodcast() {
    const context = useContext(PodcastContext);
    if (!context) {
        throw new Error('usePodcast must be used within PodcastProvider');
    }
    return context;
}

export default PodcastContext;
