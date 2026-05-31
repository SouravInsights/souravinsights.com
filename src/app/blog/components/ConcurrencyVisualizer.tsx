"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, RotateCcw } from "lucide-react";

export default function ConcurrencyVisualizer() {
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<"sequential" | "concurrent" | "parallel">("sequential");
  const [tasks, setTasks] = useState<{ id: number; progress: number; complete: boolean }[]>(
    Array.from({ length: 4 }).map((_, i) => ({ id: i, progress: 0, complete: false }))
  );

  const reset = () => {
    setTasks(Array.from({ length: 4 }).map((_, i) => ({ id: i, progress: 0, complete: false })));
    setIsRunning(false);
  };

  const startSequential = async () => {
    reset();
    setMode("sequential");
    setIsRunning(true);

    // Sequential: One finishes completely before the next begins
    for (let i = 0; i < 4; i++) {
      await new Promise<void>((resolve) => {
        let p = 0;
        const interval = setInterval(() => {
          p += 5;
          setTasks((prev) => prev.map((t) => (t.id === i ? { ...t, progress: p } : t)));
          if (p >= 100) {
            clearInterval(interval);
            setTasks((prev) => prev.map((t) => (t.id === i ? { ...t, complete: true } : t)));
            resolve();
          }
        }, 30);
      });
    }
    setIsRunning(false);
  };

  const startConcurrent = async () => {
    reset();
    setMode("concurrent");
    setIsRunning(true);

    // Concurrent (Event Loop): Starting multiple async tasks.
    // The single-threaded event loop interleaves chunks of work (like I/O or timers).
    // They are in-flight simultaneously, but JS only executes one callback at any exact microsecond.
    const promises = Array.from({ length: 4 }).map((_, i) => {
      return new Promise<void>((resolve) => {
        let p = 0;
        // Staggered intervals simulate single-thread event loop interleaving
        const interval = setInterval(() => {
          p += 5;
          setTasks((prev) => prev.map((t) => (t.id === i ? { ...t, progress: p } : t)));
          if (p >= 100) {
            clearInterval(interval);
            setTasks((prev) => prev.map((t) => (t.id === i ? { ...t, complete: true } : t)));
            resolve();
          }
        }, 50 + (i * 10)); // Artificial jitter to show interleaving
      });
    });

    await Promise.all(promises);
    setIsRunning(false);
  };

  const startParallel = async () => {
    reset();
    setMode("parallel");
    setIsRunning(true);

    // Parallel (Web Workers): True simultaneous execution. 
    // They update exactly together, and finish faster because multiple CPU cores are used.
    const promises = Array.from({ length: 4 }).map((_, i) => {
      return new Promise<void>((resolve) => {
        let p = 0;
        const interval = setInterval(() => {
          p += 5;
          setTasks((prev) => prev.map((t) => (t.id === i ? { ...t, progress: p } : t)));
          if (p >= 100) {
            clearInterval(interval);
            setTasks((prev) => prev.map((t) => (t.id === i ? { ...t, complete: true } : t)));
            resolve();
          }
        }, 25); // Faster execution due to parallel workers
      });
    });

    await Promise.all(promises);
    setIsRunning(false);
  };

  return (
    <div className="my-8 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden shadow-sm">
      <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-semibold m-0 text-gray-900 dark:text-gray-100">Sequential vs Concurrent vs Parallel</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 m-0 mt-1">
            Observe the subtle differences in execution. Sequential blocks. Concurrent interleaves. Parallel runs simultaneously.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={startSequential}
            disabled={isRunning}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            <Play size={14} /> Sequential
          </button>
          <button
            onClick={startConcurrent}
            disabled={isRunning}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Play size={14} /> Concurrent (Event Loop)
          </button>
          <button
            onClick={startParallel}
            disabled={isRunning}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <Play size={14} /> Parallel (Web Workers)
          </button>
          <button
            onClick={reset}
            disabled={isRunning}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors ml-auto"
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {tasks.map((task) => (
          <div key={task.id} className="relative">
            <div className="flex justify-between text-xs mb-2 text-gray-500 dark:text-gray-400">
              <span>Photo {task.id + 1} Processing</span>
              <span>{task.progress}%</span>
            </div>
            <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${task.complete ? "bg-green-500" : "bg-blue-500"}`}
                initial={{ width: "0%" }}
                animate={{ width: `${task.progress}%` }}
                transition={{ duration: 0.1, ease: "linear" }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="bg-gray-50 dark:bg-gray-900 p-4 border-t border-gray-200 dark:border-gray-800 text-xs text-center text-gray-500 dark:text-gray-400">
        {isRunning ? (
          <span className="animate-pulse">
            Processing in <strong className="text-gray-900 dark:text-gray-100 capitalize">{mode}</strong> mode...
          </span>
        ) : tasks.every(t => t.complete) ? (
          <span className="text-green-600 dark:text-green-500 font-medium">All tasks completed!</span>
        ) : (
          <span>Click a button above to start the simulation.</span>
        )}
      </div>
    </div>
  );
}
