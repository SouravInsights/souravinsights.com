"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Activity, ShieldCheck, Play, RotateCcw } from "lucide-react";

export default function RenderThrashingDemo() {
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<"useState" | "useRef">("useState");
  
  // useState approach
  const [badProgress, setBadProgress] = useState(0);
  const [renderCount, setRenderCount] = useState(0);
  
  // useRef approach
  const goodProgressRef = useRef(0);
  const [goodProgressUI, setGoodProgressUI] = useState(0);
  const goodRenderCount = useRef(0);
  
  // Flash effect ref to avoid re-renders just for the red flash
  const containerRef = useRef<HTMLDivElement>(null);

  const triggerFlash = () => {
    if (containerRef.current) {
      containerRef.current.classList.add("bg-red-50", "dark:bg-red-950");
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.classList.remove("bg-red-50", "dark:bg-red-950");
        }
      }, 50);
    }
  };

  const startSimulation = (selectedMode: "useState" | "useRef") => {
    setMode(selectedMode);
    setIsRunning(true);
    setBadProgress(0);
    setRenderCount(0);
    goodProgressRef.current = 0;
    setGoodProgressUI(0);
    goodRenderCount.current = 0;

    let progress = 0;
    // Simulate 200 rapid progress events firing from background workers
    const interval = setInterval(() => {
      progress += 0.5;
      
      if (selectedMode === "useState") {
        // Anti-pattern: Set state directly on every tiny event
        setBadProgress(progress);
      } else {
        // Pattern: Mutate a ref, and aggressively throttle UI updates
        goodProgressRef.current = progress;
        // Only trigger a React re-render when it crosses a 5% threshold
        if (Math.floor(progress) % 5 === 0 && Math.floor(progress) !== goodProgressUI) {
          setGoodProgressUI(Math.floor(progress));
        }
      }

      if (progress >= 100) {
        clearInterval(interval);
        setIsRunning(false);
        if (selectedMode === "useState") setBadProgress(100);
        else setGoodProgressUI(100);
      }
    }, 10);
  };

  // Track renders
  useEffect(() => {
    if (mode === "useState" && isRunning) {
      setRenderCount(c => c + 1);
      triggerFlash();
    }
  }, [badProgress, isRunning, mode]);

  useEffect(() => {
    if (mode === "useRef" && isRunning) {
      goodRenderCount.current += 1;
      triggerFlash();
    }
  }, [goodProgressUI, isRunning, mode]);

  return (
    <div 
      ref={containerRef}
      className="my-8 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden shadow-sm transition-colors duration-75"
    >
      <div className="p-4 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold m-0 text-gray-900 dark:text-gray-100">Render Thrashing Prevention</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 m-0 mt-1">Aggregating hundreds of events using Mutable Refs.</p>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Anti-Pattern: useState */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Activity size={16} className="text-red-500" /> useState (Anti-Pattern)
            </h4>
          </div>
          
          <div className="mb-6 space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Overall Progress</span>
              <span className="font-mono">{Math.floor(badProgress)}%</span>
            </div>
            <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-red-500" style={{ width: `${badProgress}%` }} />
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-800 text-xs font-mono text-gray-600 dark:text-gray-400 mb-4">
            React Re-renders Triggered:<br/>
            <span className="text-xl font-bold text-red-600 dark:text-red-400">{renderCount}</span>
          </div>

          <button
            onClick={() => startSimulation("useState")}
            disabled={isRunning}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold rounded bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors"
          >
            <Play size={14} /> Simulate Render Thrashing
          </button>
        </div>

        {/* Pattern: useRef */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <ShieldCheck size={16} className="text-green-500" /> useRef Throttling
            </h4>
          </div>
          
          <div className="mb-6 space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Overall Progress</span>
              <span className="font-mono">{goodProgressUI}%</span>
            </div>
            <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-green-500" 
                animate={{ width: `${goodProgressUI}%` }}
                transition={{ duration: 0.3, ease: "linear" }}
              />
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-800 text-xs font-mono text-gray-600 dark:text-gray-400 mb-4">
            React Re-renders Triggered:<br/>
            <span className="text-xl font-bold text-green-600 dark:text-green-400">{goodRenderCount.current}</span>
          </div>

          <button
            onClick={() => startSimulation("useRef")}
            disabled={isRunning}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold rounded bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 disabled:opacity-50 transition-colors"
          >
            <Play size={14} /> Simulate Optimized React
          </button>
        </div>

      </div>
    </div>
  );
}
