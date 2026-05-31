"use client";

import React, { useState, useRef, useEffect } from "react";
import { Cpu, Zap, AlertTriangle } from "lucide-react";

export default function WorkerOffloadDemo() {
  const [isBlocking, setIsBlocking] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [rotation, setRotation] = useState(0);

  // Keep the spinner moving via requestAnimationFrame so we can see when the main thread blocks
  useEffect(() => {
    let animationFrame: number;
    const animate = () => {
      setRotation((prev) => (prev + 3) % 360);
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  const blockMainThread = () => {
    setIsBlocking(true);
    // Give React a tiny bit of time to render the 'isBlocking' state before freezing the thread
    setTimeout(() => {
      const start = Date.now();
      // Extremely heavy synchronous task blocking the main thread
      while (Date.now() - start < 3000) {
        // block
      }
      setIsBlocking(false);
    }, 50);
  };

  const useWebWorker = () => {
    setIsWorking(true);
    
    // Simulate Web Worker using a Blob
    const workerScript = `
      self.onmessage = function() {
        const start = Date.now();
        // Heavy task happening inside the worker thread
        while (Date.now() - start < 3000) {
          // block
        }
        self.postMessage("done");
      }
    `;
    const blob = new Blob([workerScript], { type: "application/javascript" });
    const worker = new Worker(URL.createObjectURL(blob));

    worker.onmessage = () => {
      setIsWorking(false);
      worker.terminate();
    };

    worker.postMessage("start");
  };

  return (
    <div className="my-8 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden shadow-sm">
      <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold m-0 text-gray-900 dark:text-gray-100">Web Worker Offloading</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 m-0 mt-1">Watch how heavy tasks affect UI responsiveness.</p>
        </div>
      </div>

      <div className="p-8 flex flex-col items-center justify-center gap-8">
        
        {/* The React Activity Spinner */}
        <div className="flex flex-col items-center gap-4">
          <div 
            className="w-16 h-16 rounded-full border-4 border-gray-200 dark:border-gray-800 border-t-green-500 shadow-sm"
            style={{ transform: `rotate(${rotation}deg)` }}
          />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 text-center">
            {isBlocking && <span className="text-red-500 flex items-center justify-center gap-1"><AlertTriangle size={14}/> Main thread frozen!</span>}
            {isWorking && <span className="text-green-500 flex items-center justify-center gap-1"><Zap size={14}/> Background worker active!</span>}
            {!isBlocking && !isWorking && "UI Thread Active"}
          </p>
        </div>

        <div className="flex flex-wrap gap-4 justify-center w-full max-w-md">
          <button
            onClick={blockMainThread}
            disabled={isBlocking || isWorking}
            className="flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
          >
            <AlertTriangle size={24} />
            <span className="text-sm font-bold">Process on Main Thread</span>
            <span className="text-xs opacity-80 text-center">Freezes the UI for 3 seconds</span>
          </button>

          <button
            onClick={useWebWorker}
            disabled={isBlocking || isWorking}
            className="flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border border-green-200 dark:border-green-900/30 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/20 disabled:opacity-50 transition-colors"
          >
            <Cpu size={24} />
            <span className="text-sm font-bold">Process in Web Worker</span>
            <span className="text-xs opacity-80 text-center">UI remains buttery smooth</span>
          </button>
        </div>
      </div>
    </div>
  );
}
