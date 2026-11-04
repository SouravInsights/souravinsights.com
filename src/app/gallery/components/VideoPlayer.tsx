"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  Repeat,
  Volume2,
  VolumeX,
} from "lucide-react";

/** Milliseconds of stillness, while playing, before the chrome fades out. */
const CONTROLS_IDLE = 2600;

export const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
};

interface VideoPlayerProps {
  src: string;
  poster: string;
  /** When false, the mute control is omitted rather than shown doing nothing. */
  hasAudio?: boolean;
}

/**
 * The gallery's player. Native controls are replaced because they are the one
 * piece of the page that looks handed-over rather than made: a grey system bar
 * on a light recording, a different scrubber in every browser.
 *
 * The click target and the chrome are separate layers, so clicking the picture
 * toggles play while the bar keeps its own hits. The bar fades on idle only
 * while playing — a paused video keeps its controls, which is when you need
 * them most.
 */
export function VideoPlayer({ src, poster, hasAudio = true }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<number | null>(null);
  /** Whether the browser can tell us a frame was actually presented. */
  const frameCallbackRef = useRef(false);

  const reduceMotion = useReducedMotion();

  const [playing, setPlaying] = useState(false);
  // `ready` is whether the video has ever painted a frame. Until then the
  // element draws solid black, which is exactly wrong during the shared-element
  // morph — so the still carries it and the video fades in underneath.
  const [ready, setReady] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [ended, setEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [muted, setMuted] = useState(false);
  const [loop, setLoop] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  /** Show the chrome and restart the idle countdown. */
  const wakeControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    if (!videoRef.current?.paused) {
      hideTimer.current = window.setTimeout(
        () => setControlsVisible(false),
        CONTROLS_IDLE
      );
    }
  }, []);

  // Keep the chrome up while paused or scrubbing.
  useEffect(() => {
    if (!playing || scrubbing) {
      setControlsVisible(true);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    } else {
      wakeControls();
    }
  }, [playing, scrubbing, wakeControls]);

  useEffect(
    () => () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    },
    []
  );

  // Autoplay is inherited from the tap that opened the detail view; if the
  // browser still refuses it, the paused state is what renders a play button.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => setPlaying(false));
  }, []);

  // `onPlaying` means playback began, not that a frame is on screen — the video
  // still paints black for a moment after. `requestVideoFrameCallback` fires
  // when a frame is actually presented, which is the honest signal to swap the
  // still out. Where it is unavailable, `onPlaying` is the fallback.
  useEffect(() => {
    const video = videoRef.current as
      | (HTMLVideoElement & {
          requestVideoFrameCallback?: (cb: () => void) => number;
          cancelVideoFrameCallback?: (id: number) => void;
        })
      | null;
    if (!video || typeof video.requestVideoFrameCallback !== "function") return;
    frameCallbackRef.current = true;
    const id = video.requestVideoFrameCallback(() => setReady(true));
    return () => video.cancelVideoFrameCallback?.(id);
  }, []);

  useEffect(() => {
    const onFullscreenChange = () =>
      setFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      if (video.ended) video.currentTime = 0;
      video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, []);

  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const node = containerRef.current;
    if (!node) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    } else {
      node.requestFullscreen?.().catch(() => undefined);
    }
  }, []);

  const progress = duration > 0 ? currentTime / duration : 0;

  const controlButton =
    "flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70";

  return (
    <div
      ref={containerRef}
      className="group/player relative h-full w-full overflow-hidden bg-black"
      onPointerMove={wakeControls}
      onPointerLeave={() => playing && !scrubbing && setControlsVisible(false)}
    >
      {/* The still, under the video. `next/image` so it shares the grid tile's
          optimised URL and is already cached by the time the morph starts. */}
      <Image
        src={poster}
        alt=""
        aria-hidden="true"
        fill
        sizes="(max-width: 640px) 100vw, 768px"
        className={`pointer-events-none object-cover transition-opacity duration-200 ${
          ready ? "opacity-0" : "opacity-100"
        }`}
      />

      <video
        ref={videoRef}
        src={src}
        playsInline
        preload="metadata"
        loop={loop}
        muted={muted}
        onPlay={() => {
          setPlaying(true);
          setEnded(false);
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setEnded(true);
          setPlaying(false);
        }}
        onWaiting={() => setBuffering(true)}
        onCanPlay={() => setBuffering(false)}
        onPlaying={() => {
          setBuffering(false);
          if (!frameCallbackRef.current) setReady(true);
        }}
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration || 0);
          setBuffering(false);
        }}
        onTimeUpdate={(event) => {
          if (!scrubbing) setCurrentTime(event.currentTarget.currentTime);
          const video = event.currentTarget;
          if (video.buffered.length) {
            setBuffered(video.buffered.end(video.buffered.length - 1));
          }
        }}
        className={`relative h-full w-full object-contain transition-opacity duration-200 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* The picture is the play/pause target; the chrome sits above it. */}
      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? "Pause" : "Play"}
        className="absolute inset-0 z-10 cursor-pointer"
      />

      {/* Centre glyph: a state, not a control, so it never intercepts a tap. */}
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <AnimatePresence>
          {!playing && (
            <motion.span
              key={ended ? "replay" : "play"}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-black/45 text-white shadow-lg ring-1 ring-white/15 backdrop-blur-sm"
            >
              <Play className="ml-0.5 h-6 w-6" fill="currentColor" />
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Only after the first frame: a spinner over a still that is simply
          still loading is noise. */}
      {buffering && ready && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-white/80" />
        </div>
      )}

      {/* Chrome. A gradient rather than a bar: the controls need contrast on a
          white recording without a slab of UI across the picture. */}
      <motion.div
        initial={false}
        animate={{
          opacity: controlsVisible ? 1 : 0,
          y: controlsVisible || reduceMotion ? 0 : 6,
        }}
        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-2.5 pb-2.5 pt-10 ${
          controlsVisible ? "" : "pointer-events-none"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        {/* Scrubber. The visual track is drawn; a full-area range input sits on
            top so pointer drag, keyboard and screen readers all work. */}
        <div className="group/seek relative flex h-4 items-center">
          <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-white/25">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-white/35"
              style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-white"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow transition-transform duration-150 group-hover/seek:scale-110"
            style={{ left: `${progress * 100}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={currentTime}
            disabled={!duration}
            aria-label="Seek"
            onChange={(event) => seek(Number(event.target.value))}
            onPointerDown={() => setScrubbing(true)}
            onPointerUp={() => setScrubbing(false)}
            onPointerCancel={() => setScrubbing(false)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>

        <div className="mt-0.5 flex items-center gap-0.5">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
            className={controlButton}
          >
            {playing ? (
              <Pause className="h-[18px] w-[18px]" fill="currentColor" />
            ) : (
              <Play className="ml-0.5 h-[18px] w-[18px]" fill="currentColor" />
            )}
          </button>

          <span className="ml-1 select-none font-mono text-[11px] tabular-nums text-white/85">
            {formatTime(currentTime)}
            <span className="mx-1 text-white/40">/</span>
            {formatTime(duration)}
          </span>

          <div className="flex-1" />

          <button
            type="button"
            onClick={() => setLoop((value) => !value)}
            aria-pressed={loop}
            aria-label={loop ? "Looping on" : "Loop"}
            title="Loop"
            className={`${controlButton} ${loop ? "text-white" : "text-white/70"}`}
          >
            <Repeat className="h-4 w-4" />
          </button>

          {hasAudio && (
            <button
              type="button"
              onClick={() => setMuted((value) => !value)}
              aria-pressed={muted}
              aria-label={muted ? "Unmute" : "Mute"}
              className={controlButton}
            >
              {muted ? (
                <VolumeX className="h-[18px] w-[18px]" />
              ) : (
                <Volume2 className="h-[18px] w-[18px]" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            className={controlButton}
          >
            {fullscreen ? (
              <Minimize className="h-[18px] w-[18px]" />
            ) : (
              <Maximize className="h-[18px] w-[18px]" />
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
