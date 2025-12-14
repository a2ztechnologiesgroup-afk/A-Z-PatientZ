import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MusicIcon, PlayIcon, PauseIcon } from './Icons';

const PLAYLIST = [
    { name: 'Inspiring Cinematic Ambient', url: 'https://cdn.pixabay.com/download/audio/2022/08/04/audio_d0792a1827.mp3' },
    { name: 'Floating Abstract', url: 'https://cdn.pixabay.com/download/audio/2022/08/20/audio_28972821d3.mp3' },
    { name: 'Leva - Eternity', url: 'https://cdn.pixabay.com/download/audio/2023/05/10/audio_51a44c2357.mp3' },
    { name: 'Ambient Electronic', url: 'https://cdn.pixabay.com/download/audio/2022/01/10/audio_24a5202868.mp3' },
    { name: 'The Beat of Nature', url: 'https://cdn.pixabay.com/download/audio/2022/10/11/audio_5e018f9a94.mp3' },
    { name: 'Good Night', url: 'https://cdn.pixabay.com/download/audio/2024/02/09/audio_651a28a363.mp3' },
    { name: 'Just Relax', url: 'https://cdn.pixabay.com/download/audio/2023/04/06/audio_f552a9129e.mp3' },
    { name: 'Relaxing', url: 'https://cdn.pixabay.com/download/audio/2023/12/26/audio_731a5924a3.mp3' },
    { name: 'Sleep', url: 'https://cdn.pixabay.com/download/audio/2023/04/05/audio_15f8924b82.mp3' },
    { name: 'The Cradle of Your Soul', url: 'https://cdn.pixabay.com/download/audio/2023/05/16/audio_b292a9c1a6.mp3' },
    { name: 'Empty Mind', url: 'https://cdn.pixabay.com/download/audio/2023/02/03/audio_242a53b754.mp3' },
    { name: 'Ambient Music', url: 'https://cdn.pixabay.com/download/audio/2024/05/31/audio_49b1686616.mp3' },
    { name: 'Aesthetic', url: 'https://cdn.pixabay.com/download/audio/2022/05/22/audio_61353a793a.mp3' },
    { name: 'Morning Garden', url: 'https://cdn.pixabay.com/download/audio/2023/01/01/audio_82361295f7.mp3' },
    { name: 'Forest Lullaby', url: 'https://cdn.pixabay.com/download/audio/2022/02/07/audio_d075ac233b.mp3' },
    { name: 'Waterfall', url: 'https://cdn.pixabay.com/download/audio/2023/09/25/audio_1388364e79.mp3' },
    { name: 'In the Forest', url: 'https://cdn.pixabay.com/download/audio/2022/11/21/audio_a0a2a46263.mp3' },
    { name: 'Reflected Light', url: 'https://cdn.pixabay.com/download/audio/2023/06/25/audio_22a275b2d2.mp3' }
];


// Fisher-Yates shuffle algorithm
const shuffle = (array: any[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

interface MusicPlayerProps {
    currentPage: string;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ currentPage }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [shuffledPlaylist, setShuffledPlaylist] = useState<(typeof PLAYLIST)[0][]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fadeIntervalRef = useRef<number | null>(null);

  const TARGET_VOLUME = 0.5;
  const FADE_DURATION = 2000;

  useEffect(() => {
    setShuffledPlaylist(shuffle([...PLAYLIST]));
  }, []);

  const fade = useCallback((targetVolume: number, onComplete?: () => void) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

    const startVolume = audio.volume;
    const volumeChange = targetVolume - startVolume;
    if (Math.abs(volumeChange) < 0.01) {
      if (onComplete) onComplete();
      return;
    }
    const steps = 50;
    const stepDuration = FADE_DURATION / steps;
    const volumeStep = volumeChange / steps;
    fadeIntervalRef.current = window.setInterval(() => {
      const currentAudio = audioRef.current;
      if (!currentAudio) {
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        return;
      }
      const newVolume = currentAudio.volume + volumeStep;
      if ((volumeChange > 0 && newVolume >= targetVolume) || (volumeChange < 0 && newVolume <= targetVolume)) {
        currentAudio.volume = targetVolume;
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
        if (onComplete) onComplete();
      } else {
        currentAudio.volume = newVolume;
      }
    }, stepDuration);
  }, []);

  const playNextTrack = useCallback(() => {
    fade(0, () => {
      setCurrentTrackIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;
        if (nextIndex >= shuffledPlaylist.length) {
          setShuffledPlaylist(shuffle([...PLAYLIST]));
          return 0;
        }
        return nextIndex;
      });
    });
  }, [shuffledPlaylist.length, fade]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || shuffledPlaylist.length === 0) return;

    const track = shuffledPlaylist[currentTrackIndex];
    if (track && audio.src !== track.url) {
      audio.src = track.url;
    }

    const startPlayback = () => {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => fade(TARGET_VOLUME))
          .catch(error => {
            console.error("Audio playback failed:", error);
            setIsPlaying(false);
          });
      }
    };

    if (isActivated && isPlaying) {
      if (audio.readyState >= 4) { // HAVE_ENOUGH_DATA
        startPlayback();
      } else {
        const handleCanPlay = () => startPlayback();
        audio.addEventListener('canplaythrough', handleCanPlay, { once: true });
        return () => audio.removeEventListener('canplaythrough', handleCanPlay);
      }
    } else {
      fade(0, () => audio.pause());
    }
  }, [isActivated, isPlaying, currentTrackIndex, shuffledPlaylist, fade]);

  const togglePlayPause = () => {
    if (!isActivated) {
      setIsActivated(true);
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <>
      <audio ref={audioRef} onEnded={playNextTrack} crossOrigin="anonymous" />
      <button
        className="music-player-fab glassmorphism"
        onClick={togglePlayPause}
        aria-label={isPlaying ? 'Pause music' : 'Play music'}
      >
        <div className="icon-container">
          <MusicIcon className={`music-icon w-16 h-16 text-purple-300/50 ${isPlaying ? 'playing' : ''}`} />
          <div className="play-pause-icon">
            {isPlaying ? (
              <PauseIcon className="w-8 h-8 text-slate-100" />
            ) : (
              <PlayIcon className="w-8 h-8 text-slate-100 ml-1" />
            )}
          </div>
        </div>
      </button>
    </>
  );
};

export default MusicPlayer;
