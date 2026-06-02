"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';

interface VideoPlayerProps {
  src?: string;
  beforeSrc?: string;
  afterSrc?: string;
  poster?: string;
  caption?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
}

export default function VideoPlayer({ 
  src, 
  beforeSrc,
  afterSrc,
  poster, 
  caption, 
  autoPlay = false, 
  loop = true, 
  muted = true,
}: VideoPlayerProps) {
  const isDualMode = !!beforeSrc && !!afterSrc;
  const [activeTab, setActiveTab] = useState<'before' | 'after'>('after');
  
  const currentSrc = isDualMode 
    ? (activeTab === 'after' ? afterSrc : beforeSrc) 
    : src;

  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isHovering, setIsHovering] = useState(false);
  const [progress, setProgress] = useState(0);

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const wasPlayingBeforeScrollOut = useRef(false);
  const wasPlayingRef = useRef(false);
  const hasInteractedRef = useRef(false);

  // Sync state with actual video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      if (video.duration && !isScrubbing) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [isScrubbing]);

  // Handle visibility and viewport intersection to automatically pause or autoplay in view
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (!video.paused) {
          wasPlayingBeforeScrollOut.current = true;
          video.pause();
        }
      } else {
        if (wasPlayingBeforeScrollOut.current) {
          video.play().catch(() => {});
          wasPlayingBeforeScrollOut.current = false;
        }
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            // Out of view
            if (!video.paused) {
              wasPlayingBeforeScrollOut.current = true;
              video.pause();
            }
          } else {
            // In view
            if (wasPlayingBeforeScrollOut.current) {
              video.play().catch(() => {});
              wasPlayingBeforeScrollOut.current = false;
            } else if (autoPlay && !hasInteractedRef.current && video.paused) {
              // Initial autoplay only when entering viewport
              video.play().catch(() => {});
            }
          }
        });
      },
      { threshold: 0.1 }
    );

    document.addEventListener('visibilitychange', handleVisibilityChange);
    observer.observe(video);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      observer.unobserve(video);
    };
  }, [autoPlay]);

  // Handle source changes in dual mode
  useEffect(() => {
    if (videoRef.current && currentSrc) {
      videoRef.current.load();
      if (autoPlay) {
        videoRef.current.play().catch(() => {
          // Ignore auto-play blocking errors
        });
        setIsPlaying(true);
      } else {
        setIsPlaying(false);
      }
      setProgress(0);
      wasPlayingBeforeScrollOut.current = false;
      hasInteractedRef.current = false;
    }
  }, [currentSrc, autoPlay]);

  const togglePlay = () => {
    hasInteractedRef.current = true;
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  const handleReplay = () => {
    hasInteractedRef.current = true;
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
  };

  const skip = (amount: number) => {
    hasInteractedRef.current = true;
    const video = videoRef.current;
    if (video && video.duration) {
      video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + amount));
    }
  };

  // Scrubbing/Timeline Drag Logic
  const handleScrub = (clientX: number) => {
    hasInteractedRef.current = true;
    const timeline = timelineRef.current;
    const video = videoRef.current;
    if (!timeline || !video || !video.duration) return;

    const rect = timeline.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    video.currentTime = percentage * video.duration;
    setProgress(percentage * 100);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only left click
    const video = videoRef.current;
    if (!video) return;

    setIsScrubbing(true);
    wasPlayingRef.current = !video.paused;
    if (!video.paused) {
      video.pause();
    }
    handleScrub(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;

    setIsScrubbing(true);
    wasPlayingRef.current = !video.paused;
    if (!video.paused) {
      video.pause();
    }
    handleScrub(e.touches[0].clientX);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    handleScrub(e.clientX);
  };

  useEffect(() => {
    if (!isScrubbing) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleScrub(e.clientX);
    };

    const handleMouseUp = () => {
      setIsScrubbing(false);
      const video = videoRef.current;
      if (video && wasPlayingRef.current) {
        video.play().catch(() => {});
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      handleScrub(e.touches[0].clientX);
    };

    const handleTouchEnd = () => {
      setIsScrubbing(false);
      const video = videoRef.current;
      if (video && wasPlayingRef.current) {
        video.play().catch(() => {});
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isScrubbing]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;

    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      togglePlay();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      skip(-5);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      skip(5);
    }
  };

  return (
    <div className="my-10 flex flex-col items-center w-full">
      <div 
        className={`w-full relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm group focus-visible:border-gray-400 dark:focus-visible:border-gray-500 focus-visible:ring-1 focus-visible:ring-gray-400/20 dark:focus-visible:ring-gray-500/20 outline-none transition-all duration-300 ${isExpanded ? 'max-w-full' : 'max-w-3xl'}`}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* macOS style browser window header */}
        <div className="h-10 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-2 w-full relative z-10 select-none">
          <div className="flex gap-1.5 absolute left-4">
            <div className="w-3 h-3 rounded-full bg-red-400 dark:bg-gray-700"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400 dark:bg-gray-700"></div>
            <div className="w-3 h-3 rounded-full bg-green-400 dark:bg-gray-700"></div>
          </div>
          
          {/* Dual Toggle or URL Bar */}
          {isDualMode ? (
            <div className="mx-auto flex bg-gray-200/80 dark:bg-gray-950 p-0.5 rounded-lg shadow-inner text-xs font-medium">
              <button
                onClick={() => setActiveTab('before')}
                className={`px-4 py-1 rounded-md transition-all ${
                  activeTab === 'before'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Before
              </button>
              <button
                onClick={() => setActiveTab('after')}
                className={`px-4 py-1 rounded-md transition-all ${
                  activeTab === 'after'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                After
              </button>
            </div>
          ) : (
            <div className="mx-auto h-6 w-1/3 max-w-[200px] bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-inner"></div>
          )}
        </div>

        {/* Video Container */}
        <div 
          className="relative w-full aspect-video bg-black flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          {currentSrc ? (
            <>
              <video
                ref={videoRef}
                className={`w-full h-full object-contain transition-all duration-300 ${!isPlaying ? 'opacity-90 dark:opacity-40' : 'opacity-100'}`}
                src={currentSrc}
                poster={poster}
                autoPlay={autoPlay}
                loop={loop}
                muted={muted}
                playsInline
              >
                Your browser does not support the video tag.
              </video>

              {/* Overlay when paused */}
              <div 
                className={`absolute inset-0 flex items-center justify-center transition-all duration-300 pointer-events-none select-none ${
                  !isPlaying 
                    ? 'bg-black/10 dark:bg-black/40 opacity-100' 
                    : 'bg-transparent opacity-0'
                }`}
              >
                <div 
                  className={`w-14 h-14 rounded-full bg-black/30 dark:bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xl transition-all duration-300 ${
                    !isPlaying ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
                  }`}
                >
                  <Play size={24} className="fill-current translate-x-0.5 text-white" />
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
              <span className="text-sm font-medium">Video Placeholder</span>
              <span className="text-xs font-mono mt-1">Missing src or before/afterSrc</span>
            </div>
          )}
        </div>

        {/* Structural Control Bar */}
        {currentSrc && (
          <div 
            className="h-12 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-800 flex items-center px-4 gap-4 w-full relative z-10"
            onClick={(e) => e.stopPropagation()} 
          >
            {/* Play/Pause & Skip Controls */}
            <div className="flex items-center gap-3">
              <button 
                onClick={togglePlay} 
                className="flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors focus:outline-none"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause size={16} className="fill-current" />
                ) : (
                  <Play size={16} className="fill-current" />
                )}
              </button>

              <button 
                onClick={() => skip(-10)} 
                className="flex items-center gap-0.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors focus:outline-none"
                aria-label="Skip backward 10 seconds"
              >
                <ChevronLeft size={16} />
                <span className="text-[10px] font-mono font-bold leading-none select-none">10s</span>
              </button>

              <button 
                onClick={() => skip(10)} 
                className="flex items-center gap-0.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors focus:outline-none"
                aria-label="Skip forward 10 seconds"
              >
                <span className="text-[10px] font-mono font-bold leading-none select-none">10s</span>
                <ChevronRight size={16} />
              </button>
            </div>
            
            {/* Seekable Timeline */}
            <div 
              ref={timelineRef}
              className="flex-1 h-6 flex items-center cursor-pointer group/timeline relative select-none"
              onClick={handleTimelineClick}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              <div className="w-full h-1 bg-gray-200 dark:bg-gray-800 rounded-full transition-all duration-150 group-hover/timeline:h-1.5 relative overflow-hidden">
                <div 
                  className="absolute left-0 top-0 h-full bg-gray-600 dark:bg-gray-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {/* Thumb */}
              <div 
                className="absolute w-3 h-3 bg-gray-800 dark:bg-gray-100 rounded-full -translate-x-1/2 -translate-y-1/2 top-1/2 opacity-0 group-hover/timeline:opacity-100 transition-opacity duration-150 shadow pointer-events-none"
                style={{ left: `${progress}%` }}
              />
            </div>

            <div className="flex items-center gap-3">
              {/* Size Toggle Button (Only on sm screens and up) */}
              <button 
                onClick={() => setIsExpanded(!isExpanded)} 
                className="hidden sm:flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors focus:outline-none"
                aria-label={isExpanded ? "Collapse video player size" : "Expand video player size"}
                title={isExpanded ? "Collapse player size" : "Expand player size"}
              >
                {isExpanded ? (
                  <Minimize2 size={16} />
                ) : (
                  <Maximize2 size={16} />
                )}
              </button>

              <button 
                onClick={handleReplay} 
                className="flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors focus:outline-none"
                aria-label="Replay"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
      
      {caption && (
        <p className="mt-4 text-sm text-center text-gray-500 dark:text-gray-400 max-w-lg mx-auto select-none">
          {caption}
        </p>
      )}
    </div>
  );
}

