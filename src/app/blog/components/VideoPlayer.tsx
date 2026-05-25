"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

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
  autoPlay = true, 
  loop = true, 
  muted = true,
}: VideoPlayerProps) {
  const isDualMode = !!beforeSrc && !!afterSrc;
  const [activeTab, setActiveTab] = useState<'before' | 'after'>('after');
  
  const currentSrc = isDualMode 
    ? (activeTab === 'after' ? afterSrc : beforeSrc) 
    : src;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isHovering, setIsHovering] = useState(false);
  const [progress, setProgress] = useState(0);

  // Sync state with actual video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      if (video.duration) {
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
  }, []);

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
    }
  }, [currentSrc, autoPlay]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  const handleReplay = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
  };

  return (
    <div className="my-10 flex flex-col items-center w-full">
      <div 
        className="w-full relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm group"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        
        {/* macOS style browser window header */}
        <div className="h-10 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-2 w-full relative z-10">
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
          className="relative w-full aspect-video bg-gray-100 dark:bg-gray-900 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          {currentSrc ? (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-contain"
                src={currentSrc}
                poster={poster}
                autoPlay={autoPlay}
                loop={loop}
                muted={muted}
                playsInline
              >
                Your browser does not support the video tag.
              </video>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
              <span className="text-sm font-medium">Video Placeholder</span>
              <span className="text-xs font-mono mt-1">Missing src or before/afterSrc</span>
            </div>
          )}
        </div>

        {/* Structural Control Bar (Matches Header) */}
        {currentSrc && (
          <div 
            className="h-12 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-800 flex items-center px-4 gap-4 w-full relative z-10"
            onClick={(e) => e.stopPropagation()} 
          >
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
            
            {/* Minimal Timeline */}
            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gray-400 dark:bg-gray-500 rounded-full transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>

            <button 
              onClick={handleReplay} 
              className="flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors focus:outline-none"
              aria-label="Replay"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        )}
      </div>
      
      {caption && (
        <p className="mt-4 text-sm text-center text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
          {caption}
        </p>
      )}
    </div>
  );
}
