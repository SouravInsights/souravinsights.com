"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Server } from "lucide-react";

interface UploadTask {
  id: string;
  status: "queued" | "active" | "completed";
}

export default function SemaphoreVisualizer() {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const MAX_CONCURRENT = 3;
  const activeCount = tasks.filter((t) => t.status === "active").length;

  const addTasks = () => {
    const newTasks = Array.from({ length: 5 }).map(() => ({
      id: Math.random().toString(36).substr(2, 6),
      status: "queued" as const,
    }));
    setTasks((prev) => [...prev, ...newTasks]);
  };

  useEffect(() => {
    // Semaphore Logic
    if (activeCount < MAX_CONCURRENT) {
      const queuedTask = tasks.find((t) => t.status === "queued");
      if (queuedTask) {
        setTasks((prev) =>
          prev.map((t) => (t.id === queuedTask.id ? { ...t, status: "active" } : t))
        );
      }
    }
  }, [tasks, activeCount]);

  useEffect(() => {
    // Process active tasks
    const activeTasks = tasks.filter((t) => t.status === "active");
    activeTasks.forEach((task) => {
      // simulate network request taking 2-4 seconds
      const duration = 2000 + Math.random() * 2000;
      const timer = setTimeout(() => {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: "completed" } : t))
        );
      }, duration);
      return () => clearTimeout(timer);
    });
  }, [tasks.filter(t => t.status === "active").map(t => t.id).join(",")]);

  const queuedTasks = tasks.filter((t) => t.status === "queued");
  const activeTasks = tasks.filter((t) => t.status === "active");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  return (
    <div className="my-8 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden shadow-sm">
      <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold m-0 text-gray-900 dark:text-gray-100">Upload Semaphore</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 m-0 mt-1">Limits concurrent network requests to {MAX_CONCURRENT}.</p>
        </div>
        <button
          onClick={addTasks}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors"
        >
          <Plus size={14} /> Add 5 Photos
        </button>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Queue */}
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800 min-h-[200px]">
          <h4 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-4 flex items-center justify-between">
            <span>Waiting Queue</span>
            <span className="bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">{queuedTasks.length}</span>
          </h4>
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {queuedTasks.map((t) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  key={t.id}
                  className="w-8 h-8 rounded bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 flex items-center justify-center text-[10px] text-gray-500"
                >
                  {t.id}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Active Pipes */}
        <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30 min-h-[200px]">
          <h4 className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400 mb-4 flex items-center justify-between">
            <span>Active Uploads (Max {MAX_CONCURRENT})</span>
            <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">{activeTasks.length} / {MAX_CONCURRENT}</span>
          </h4>
          <div className="space-y-3">
            {Array.from({ length: MAX_CONCURRENT }).map((_, i) => {
              const activeTask = activeTasks[i];
              return (
                <div key={i} className="h-12 border-2 border-dashed border-blue-200 dark:border-blue-800/50 rounded-lg flex items-center justify-center bg-white dark:bg-gray-950 relative overflow-hidden">
                  {activeTask ? (
                    <motion.div
                      layoutId={`task-${activeTask.id}`}
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2.5, ease: "linear" }}
                      className="absolute inset-0 bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"
                    >
                      <span className="text-xs font-medium text-blue-700 dark:text-blue-300 z-10 flex items-center gap-2">
                        <Server size={12} className="animate-pulse" /> Uploading {activeTask.id}
                      </span>
                    </motion.div>
                  ) : (
                    <span className="text-[10px] text-gray-400 dark:text-gray-600 uppercase font-medium">Empty Slot</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Completed */}
        <div className="bg-green-50/50 dark:bg-green-900/10 p-4 rounded-lg border border-green-100 dark:border-green-900/30 min-h-[200px]">
          <h4 className="text-xs font-bold uppercase text-green-600 dark:text-green-400 mb-4 flex items-center justify-between">
            <span>Cloud Storage</span>
            <span className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">{completedTasks.length}</span>
          </h4>
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {completedTasks.map((t) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.5, y: -20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  key={t.id}
                  className="w-8 h-8 rounded bg-green-500 shadow-sm border border-green-600 flex items-center justify-center text-[10px] text-white font-medium"
                >
                  ✓
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}
