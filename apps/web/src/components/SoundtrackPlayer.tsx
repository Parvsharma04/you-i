'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

interface Track {
  id: string;
  title: string;
  artist: string;
  localPath: string;
  fallbackUrl: string;
}

const TRACKS: Track[] = [
  {
    id: 'kiss_me_thru_the_phone',
    title: "Kiss Me Thru The Phone",
    artist: "Soulja Boy (feat. Sammie)",
    localPath: '/audio/kiss_me_thru_the_phone.mp3',
    fallbackUrl: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3'
  },
  {
    id: 'only_shorty',
    title: "You're My Only Shorty",
    artist: "Demi Lovato (feat. Iyaz)",
    localPath: '/audio/only_shorty.mp3',
    fallbackUrl: 'https://assets.mixkit.co/music/preview/mixkit-dreaming-big-31.mp3'
  },
  {
    id: 'replay',
    title: "Replay",
    artist: "Iyaz",
    localPath: '/audio/replay.mp3',
    fallbackUrl: 'https://assets.mixkit.co/music/preview/mixkit-retro-gameland-281.mp3'
  },
  {
    id: 'beautiful_girls',
    title: "Beautiful Girls",
    artist: "Sean Kingston",
    localPath: '/audio/beautiful_girls.mp3',
    fallbackUrl: 'https://assets.mixkit.co/music/preview/mixkit-serenade-598.mp3'
  }
];

export function SoundtrackPlayer() {
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentTrack = TRACKS[currentTrackIndex];

  // Try playing the current audio source
  const attemptPlay = async () => {
    if (!audioRef.current) return;
    try {
      audioRef.current.muted = isMuted;
      await audioRef.current.play();
      setIsPlaying(true);
      setAutoplayBlocked(false);
    } catch (error) {
      console.warn("Autoplay blocked by browser policy. Requiring user interaction.", error);
      setAutoplayBlocked(true);
      setIsPlaying(false);
    }
  };

  // Set up audio source and track error handling
  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audio.volume = 0.45;
    audioRef.current = audio;

    // Try to load local file first, fall back to streaming url if not found
    const loadTrackSource = async (track: Track) => {
      try {
        const response = await fetch(track.localPath, { method: 'HEAD' });
        if (response.ok) {
          audio.src = track.localPath;
        } else {
          audio.src = track.fallbackUrl;
        }
      } catch {
        audio.src = track.fallbackUrl;
      }
      audio.load();

      // If we already started playing, continue playing the new source
      if (isPlaying) {
        attemptPlay();
      }
    };

    loadTrackSource(currentTrack);

    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [currentTrackIndex]);

  // Route-based playlist manager (Auto-selects fitting songs)
  useEffect(() => {
    if (!pathname) return;

    if (pathname.includes('/results')) {
      // Results screen! Let's play "You're My Only Shorty" (Track index 1)
      setCurrentTrackIndex(1);
      setTimeout(() => attemptPlay(), 500);
      showToast("💖 Playing Results Theme: You're My Only Shorty!");
    } else if (pathname.includes('/lobby') || pathname.includes('/quiz')) {
      // Lobby or Quiz screen! Let's play "Kiss Me Thru The Phone" (Track index 0)
      setCurrentTrackIndex(0);
      setTimeout(() => attemptPlay(), 500);
      showToast("🎵 Playing Lobby Theme: Kiss Me Thru The Phone!");
    }
  }, [pathname]);

  // Handle manual play/pause toggle
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      attemptPlay();
    }
  };

  // Handle manual mute/unmute
  const toggleMute = () => {
    if (!audioRef.current) return;
    const newMuted = !isMuted;
    audioRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  // Play next track randomly
  const playRandomTrack = () => {
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * TRACKS.length);
    } while (nextIndex === currentTrackIndex && TRACKS.length > 1);

    setCurrentTrackIndex(nextIndex);
    setIsPlaying(true);
    showToast(`🔀 Shuffling: Playing ${TRACKS[nextIndex].title}!`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-[#ff1493] text-white border-2 border-black font-display text-sm py-2 px-4 shadow-[4px_4px_0px_#000] animate-[fadeInUp_0.3s_ease_forwards]">
          {toastMessage}
        </div>
      )}

      {/* Floating Retro Widget */}
      <div
        className="fixed top-6 right-0.5 md:bottom-6 md:top-auto md:right-6 z-50 flex flex-col md:flex-col-reverse items-end gap-2 font-display text-text-primary"
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Main Audio controller pill */}
        <div className="flex flex-col md:flex-row items-center gap-3 bg-[#fff0f5] border-4 border-black py-2.5 px-0.5 md:px-4 shadow-[4px_4px_0px_#000] rounded-none hover:translate-y-[-2px] transition-transform">
          {/* Animated visualizer bars */}
          {isPlaying && !isMuted ? (
            <div className="flex items-end gap-[3px] h-3 w-4 mr-1">
              <span className="w-[3px] bg-[#ff1493] animate-[barHeight1_0.8s_ease_infinite]" />
              <span className="w-[3px] bg-accent animate-[barHeight2_0.6s_ease_infinite]" />
              <span className="w-[3px] bg-[#ff1493] animate-[barHeight3_0.9s_ease_infinite]" />
            </div>
          ) : (
            <div className="flex items-end gap-[3px] h-3 w-4 mr-1 opacity-40">
              <span className="w-[3px] h-1 bg-text-secondary" />
              <span className="w-[3px] h-1 bg-text-secondary" />
              <span className="w-[3px] h-1 bg-text-secondary" />
            </div>
          )}

          {/* Autoplay Unlock Button or Spinning CD Icon */}
          {autoplayBlocked ? (
            <button
              onClick={togglePlay}
              className="bg-[#ff1493] text-white border-2 border-black text-[10px] font-bold py-1 px-2.5 shadow-[2px_2px_0px_#000] hover:bg-hotpink animate-pulse"
            >
              PLAY MUSIC 🎵
            </button>
          ) : (
            <button
              onClick={togglePlay}
              className="relative flex items-center justify-center w-8 h-8 rounded-full border-2 border-black bg-white focus:outline-none overflow-hidden"
            >
              {/* Retro vinyl / CD element rotating */}
              <div
                className={`w-full h-full bg-[#333] border-2 border-dashed border-white rounded-full flex items-center justify-center ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}
              >
                <div className="w-2.5 h-2.5 bg-[#ffd1dc] rounded-full border border-black" />
              </div>
            </button>
          )}

          {/* Basic quick actions */}
          <div className="flex flex-col md:flex-row items-center gap-2">
            <button
              onClick={toggleMute}
              className="text-lg hover:scale-110 transition-transform active:scale-95"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
            <button
              onClick={playRandomTrack}
              className="text-lg hover:scale-110 transition-transform active:scale-95"
              title="Next Track"
            >
              🔀
            </button>
          </div>
        </div>

        {/* Compact Expanded Track info (Dropdowns below the pill at top-right) */}
        {isExpanded && (
          <div className="bg-[#fff0f5] border-4 border-black p-4 w-72 flex flex-col gap-3 shadow-[6px_6px_0px_#000] animate-[fadeIn_0.2s_ease_forwards] text-left mt-1">
            <h4 className="text-xs font-bold text-[#ff1493] border-b-2 border-black pb-1 tracking-wider">RETRO SOUNDTRACK</h4>
            <div className="text-xs leading-relaxed text-text-secondary flex flex-col gap-1">
              <p className="font-bold text-black">{currentTrack.title}</p>
              <p className="italic">{currentTrack.artist}</p>
            </div>
            <div className="flex gap-2 justify-between mt-1">
              {TRACKS.map((t, idx) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setCurrentTrackIndex(idx);
                    setIsPlaying(true);
                  }}
                  className={`text-[9px] border p-1.5 font-bold ${currentTrackIndex === idx ? 'bg-[#ff1493] text-white border-black' : 'bg-white border-gray-300 hover:border-black'}`}
                >
                  TRACK {idx + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Embedded visualizer keyframe animations */}
      <style jsx global>{`
        @keyframes barHeight1 {
          0%, 100% { height: 4px; }
          50% { height: 12px; }
        }
        @keyframes barHeight2 {
          0%, 100% { height: 12px; }
          50% { height: 4px; }
        }
        @keyframes barHeight3 {
          0%, 100% { height: 6px; }
          50% { height: 12px; }
        }
      `}</style>
    </>
  );
}
