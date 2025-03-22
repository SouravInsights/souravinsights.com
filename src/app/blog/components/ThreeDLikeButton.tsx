"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useSound from "use-sound";
import { usePostLikes } from "@/hooks/usePostLikes";
import posthog from "posthog-js";

interface Particle {
  id: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
  color: string;
}

interface ThreeDLikeButtonProps {
  slug: string;
}

const ThreeDLikeButton = ({ slug }: ThreeDLikeButtonProps) => {
  const { totalLikes, userLikes, addLike, isLoading } = usePostLikes({
    slug,
    initialTotalLikes: 0,
    initialUserLikes: 0,
  });

  const [particles, setParticles] = useState<Particle[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const MAX_USER_LIKES = 10;

  // Calculate fill percentage for the heart
  const fillPercentage = Math.min(100, (userLikes / MAX_USER_LIKES) * 100);

  // Sound effect with slightly increased pitch on each click
  const [playbackRate, setPlaybackRate] = useState(0.75);
  const [play] = useSound("/sounds/pop.mp3", {
    playbackRate,
    volume: 0.5,
  });

  // Fill animation ref
  const fillAnimationRef = useRef<NodeJS.Timeout | null>(null);
  const [animatedFillPercentage, setAnimatedFillPercentage] = useState(0);

  // Animate fill when userLikes changes
  useEffect(() => {
    // Clear any existing animation
    if (fillAnimationRef.current) {
      clearInterval(fillAnimationRef.current);
    }

    const targetPercentage = fillPercentage;
    let currentPercentage = animatedFillPercentage;

    // Only animate if we need to increase the fill
    if (targetPercentage > currentPercentage) {
      setIsAnimating(true);

      // Create a smooth fill animation
      fillAnimationRef.current = setInterval(() => {
        currentPercentage += 2; // Increase by 2% each frame for smooth animation

        if (currentPercentage >= targetPercentage) {
          currentPercentage = targetPercentage;
          clearInterval(fillAnimationRef.current!);
          setIsAnimating(false);
        }

        setAnimatedFillPercentage(currentPercentage);
      }, 16); // ~60fps
    }

    return () => {
      if (fillAnimationRef.current) {
        clearInterval(fillAnimationRef.current);
      }
    };
  }, [fillPercentage, animatedFillPercentage]);

  // Different expressions based on like count
  const getHeartExpression = () => {
    if (userLikes === 0) return "neutral";
    if (userLikes === MAX_USER_LIKES) return "max";
    if (userLikes > MAX_USER_LIKES * 0.7) return "very-happy";
    if (userLikes > MAX_USER_LIKES * 0.3) return "happy";
    return "smile";
  };

  const handleLike = () => {
    if (userLikes < MAX_USER_LIKES) {
      // Track like event with PostHog
      posthog.capture("blog_post_liked", {
        slug: slug,
        current_likes: userLikes,
        total_likes: totalLikes,
        max_reached: userLikes === MAX_USER_LIKES - 1,
      });

      // Call the API to add a like
      addLike();

      // Generate visual effects
      generateParticles();

      // Play sound with increasing pitch
      setPlaybackRate((prev) => Math.min(prev + 0.08, 1.5));
      play();
    }
  };

  const generateParticles = () => {
    const newParticles: Particle[] = [];
    const colors = [
      "#f87171",
      "#fb923c",
      "#fbbf24",
      "#a3e635",
      "#34d399",
      "#22d3ee",
      "#60a5fa",
      "#a78bfa",
      "#e879f9",
    ];

    for (let i = 0; i < 12; i++) {
      newParticles.push({
        id: `particle-${Date.now()}-${i}`,
        x: (Math.random() - 0.5) * 100,
        y: -(Math.random() * 80 + 10),
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    setParticles([...particles, ...newParticles]);

    // Clean up particles after animation
    setTimeout(() => {
      setParticles((prevParticles) =>
        prevParticles.filter((p) => !newParticles.find((np) => np.id === p.id))
      );
    }, 1000);
  };

  // Get fill color based on percentage
  const getFillColor = () => {
    // Create a fun color progression as the heart fills
    if (animatedFillPercentage <= 10) return "#f87171"; // red
    if (animatedFillPercentage <= 20) return "#fb923c"; // orange
    if (animatedFillPercentage <= 30) return "#fbbf24"; // amber
    if (animatedFillPercentage <= 40) return "#facc15"; // yellow
    if (animatedFillPercentage <= 50) return "#a3e635"; // lime
    if (animatedFillPercentage <= 60) return "#4ade80"; // green
    if (animatedFillPercentage <= 70) return "#2dd4bf"; // teal
    if (animatedFillPercentage <= 80) return "#60a5fa"; // blue
    if (animatedFillPercentage <= 90) return "#a78bfa"; // violet
    return "#e879f9"; // pink
  };

  // Track when max likes are reached
  useEffect(() => {
    if (userLikes === MAX_USER_LIKES) {
      posthog.capture("blog_post_max_likes_reached", {
        slug: slug,
        total_likes: totalLikes,
      });
    }
  }, [userLikes, totalLikes, slug]);

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        {/* Confetti particles */}
        <AnimatePresence>
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute z-10 rounded-full"
              initial={{
                x: 0,
                y: 0,
                scale: 0,
                opacity: 0.8,
              }}
              animate={{
                x: particle.x,
                y: particle.y,
                scale: 1,
                opacity: 0,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              style={{
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color,
                transform: `rotate(${particle.rotation}deg)`,
              }}
            />
          ))}
        </AnimatePresence>

        {/* Heart Button */}
        <motion.button
          onClick={handleLike}
          className="relative outline-none focus:outline-none transform-gpu"
          whileHover={{
            scale: 1.05,
            y: -2,
          }}
          whileTap={{
            scale: 0.95,
            y: 2,
          }}
          aria-label="Like this post"
          disabled={userLikes >= MAX_USER_LIKES || isLoading}
        >
          <div className="relative">
            {/* 3D Shadow/Base Layer */}
            <svg
              width="64"
              height="64"
              viewBox="0 0 60 60"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-12 h-12 md:w-14 md:h-14 absolute top-1 left-1 z-0 opacity-30"
            >
              <path
                d="M30 55C30 55 5 40 5 20C5 11.5 12 5 20 5C25 5 28.5 7.5 30 10C31.5 7.5 35 5 40 5C48 5 55 11.5 55 20C55 40 30 55 30 55Z"
                className="fill-gray-800 dark:fill-black"
              />
            </svg>

            {/* Heart Shape (Main) */}
            <svg
              width="60"
              height="60"
              viewBox="0 0 60 60"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-12 h-12 md:w-14 md:h-14 relative z-10"
            >
              {/* Heart Background (always visible, partial) */}
              <path
                d="M30 55C30 55 5 40 5 20C5 11.5 12 5 20 5C25 5 28.5 7.5 30 10C31.5 7.5 35 5 40 5C48 5 55 11.5 55 20C55 40 30 55 30 55Z"
                className="fill-gray-200 dark:fill-gray-700 transition-colors duration-300"
              />

              {/* Heart Fill Animation - uses clipPath to create the filling effect */}
              <defs>
                <clipPath id="heartFillClip">
                  <path d="M30 55C30 55 5 40 5 20C5 11.5 12 5 20 5C25 5 28.5 7.5 30 10C31.5 7.5 35 5 40 5C48 5 55 11.5 55 20C55 40 30 55 30 55Z" />
                </clipPath>
              </defs>

              {/* Heart Fill Shape - This will be the colored filling */}
              <path
                d="M30 55C30 55 5 40 5 20C5 11.5 12 5 20 5C25 5 28.5 7.5 30 10C31.5 7.5 35 5 40 5C48 5 55 11.5 55 20C55 40 30 55 30 55Z"
                style={{
                  fill: getFillColor(),
                  clipPath: `polygon(0% ${
                    100 - animatedFillPercentage
                  }%, 100% ${
                    100 - animatedFillPercentage
                  }%, 100% 100%, 0% 100%)`,
                }}
                className="transition-all duration-300"
              />

              {/* Heart Outline */}
              <path
                d="M30 55C30 55 5 40 5 20C5 11.5 12 5 20 5C25 5 28.5 7.5 30 10C31.5 7.5 35 5 40 5C48 5 55 11.5 55 20C55 40 30 55 30 55Z"
                className="stroke-gray-500 dark:stroke-gray-400 fill-none"
                strokeWidth="1.5"
              />

              {/* 3D Highlight */}
              <path
                d="M30 15C30 15 25 10 20 10C15 10 10 15 10 20C10 21 10 22 10.5 23.5"
                className="stroke-white dark:stroke-gray-200 fill-none opacity-50"
                strokeWidth="1.5"
                strokeLinecap="round"
              />

              {/* Expressions based on like count */}
              {getHeartExpression() === "neutral" && (
                <>
                  {/* Neutral expression */}
                  <circle
                    cx="22"
                    cy="25"
                    r="2"
                    className="fill-gray-700 dark:fill-white"
                  />
                  <circle
                    cx="38"
                    cy="25"
                    r="2"
                    className="fill-gray-700 dark:fill-white"
                  />
                  <path
                    d="M24 35H36"
                    className="stroke-gray-700 dark:stroke-white"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </>
              )}

              {getHeartExpression() === "smile" && (
                <>
                  {/* Slightly happy expression */}
                  <circle
                    cx="22"
                    cy="25"
                    r="2"
                    className="fill-gray-700 dark:fill-white"
                  />
                  <circle
                    cx="38"
                    cy="25"
                    r="2"
                    className="fill-gray-700 dark:fill-white"
                  />
                  <path
                    d="M24 33C26 35 34 35 36 33"
                    className="stroke-gray-700 dark:stroke-white"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </>
              )}

              {getHeartExpression() === "happy" && (
                <>
                  {/* Happy expression */}
                  <circle
                    cx="22"
                    cy="25"
                    r="2"
                    className="fill-gray-700 dark:fill-white"
                  />
                  <circle
                    cx="38"
                    cy="25"
                    r="2"
                    className="fill-gray-700 dark:fill-white"
                  />
                  <path
                    d="M24 32C26 36 34 36 36 32"
                    className="stroke-gray-700 dark:stroke-white"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </>
              )}

              {getHeartExpression() === "very-happy" && (
                <>
                  {/* Very happy expression */}
                  <path
                    d="M20 25C20 23.8954 20.8954 23 22 23C23.1046 23 24 23.8954 24 25"
                    className="stroke-gray-700 dark:stroke-white"
                    strokeWidth="2"
                  />
                  <path
                    d="M36 25C36 23.8954 36.8954 23 38 23C39.1046 23 40 23.8954 40 25"
                    className="stroke-gray-700 dark:stroke-white"
                    strokeWidth="2"
                  />
                  <path
                    d="M24 32C26 36 34 36 36 32"
                    className="stroke-gray-700 dark:stroke-white"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </>
              )}

              {getHeartExpression() === "max" && (
                <>
                  {/* Max likes expression */}
                  <path
                    d="M20 23C20 24.1046 20.8954 25 22 25C23.1046 25 24 24.1046 24 23"
                    className="stroke-gray-700 dark:stroke-white"
                    strokeWidth="2"
                  />
                  <path
                    d="M36 23C36 24.1046 36.8954 25 38 25C39.1046 25 40 24.1046 40 23"
                    className="stroke-gray-700 dark:stroke-white"
                    strokeWidth="2"
                  />
                  <path
                    d="M24 33C26 37 34 37 36 33"
                    className="stroke-gray-700 dark:stroke-white"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M30 29L33 26M30 29L27 26"
                    className="stroke-gray-700 dark:stroke-white"
                    strokeWidth="1.5"
                  />
                </>
              )}
            </svg>
          </div>
        </motion.button>
      </div>

      {/* Like Count */}
      <motion.div
        className="font-mono tracking-tight text-xl md:text-2xl tabular-nums text-gray-700 dark:text-gray-200"
        animate={userLikes > 0 ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        {totalLikes.toLocaleString()}
      </motion.div>
    </div>
  );
};

export default ThreeDLikeButton;
