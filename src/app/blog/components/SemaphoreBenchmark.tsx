"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Play, RotateCcw, Activity, ShieldAlert, ShieldCheck, CheckCircle2, Loader2, AlertTriangle, ArrowRight } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UploadTask {
  id: string;
  name: string;
  sizeMB: number;
  state: "idle" | "queued" | "uploading" | "done" | "error";
  progress: number;
}

interface LogEntry {
  time: string;
  msg: string;
  type: "ok" | "warn" | "err" | "info";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now() {
  return new Date().toLocaleTimeString();
}

function generateDummyFiles(count: number): UploadTask[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: `IMG_${(1001 + i).toString()}`,
    name: `photo_${i + 1}.heic`,
    sizeMB: 6 + Math.random() * 4, // 6-10 MB
    state: "idle",
    progress: 0,
  }));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, accent, subtext }: { label: string; value: string | React.ReactNode; accent?: "green" | "amber" | "red" | "blue", subtext?: string }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3 flex-1 min-w-[120px]">
      <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
        {label}
      </div>
      <div
        className={`text-xl font-bold font-mono tabular-nums ${
          accent === "green" ? "text-emerald-500"
          : accent === "red" ? "text-red-500"
          : accent === "amber" ? "text-amber-500"
          : accent === "blue" ? "text-blue-500"
          : "text-gray-900 dark:text-gray-100"
        }`}
      >
        {value}
      </div>
      {subtext && (
        <div className="text-[9px] text-gray-400 mt-1 uppercase tracking-wide font-semibold">{subtext}</div>
      )}
    </div>
  );
}

function FileCard({ task }: { task: UploadTask }) {
  const isUp = task.state === "uploading";
  const isDone = task.state === "done";
  const isQueued = task.state === "queued";
  const isErr = task.state === "error";

  return (
    <div
      className={`flex flex-col relative rounded-md border overflow-hidden transition-all duration-300 ${
        isUp ? "bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/50"
        : isDone ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/50"
        : isErr ? "bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-900/50"
        : isQueued ? "bg-blue-50/30 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30"
        : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
      }`}
    >
      {/* Progress Background */}
      {isUp && (
        <div 
          className="absolute inset-y-0 left-0 bg-amber-100 dark:bg-amber-900/30 transition-all duration-200" 
          style={{ width: `${task.progress}%` }} 
        />
      )}
      
      <div className="p-2 flex items-center gap-2 relative z-10">
        {isUp ? (
          <Loader2 className="animate-spin text-amber-500 shrink-0" size={14} />
        ) : isDone ? (
          <CheckCircle2 className="text-emerald-500 shrink-0" size={14} />
        ) : isErr ? (
          <AlertTriangle className="text-red-500 shrink-0" size={14} />
        ) : isQueued ? (
          <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-400 border-dashed shrink-0 animate-[spin_4s_linear_infinite]" />
        ) : (
          <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 dark:border-gray-600 shrink-0" />
        )}
        
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 truncate">
            {task.id}
          </span>
          <span className="text-[9px] text-gray-400 font-mono">
            {task.sizeMB.toFixed(1)} MB
          </span>
        </div>
        
        {isUp && (
           <span className="ml-auto text-[9px] font-mono text-amber-600 dark:text-amber-400 font-bold">
             {Math.round(task.progress)}%
           </span>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SemaphoreBenchmark() {
  const [tasks, setTasks] = useState<UploadTask[]>(generateDummyFiles(20));
  
  const [runningNaive, setRunningNaive] = useState(false);
  const [runningSemaphore, setRunningSemaphore] = useState(false);
  
  const [naiveDone, setNaiveDone] = useState(false);
  const [semaDone, setSemaDone] = useState(false);
  
  const [activeConnections, setActiveConnections] = useState(0);
  const [peakConnections, setPeakConnections] = useState(0);
  const [activeMemory, setActiveMemory] = useState(0); // in MB
  const [peakMemory, setPeakMemory] = useState(0); // in MB
  
  const [logs, setLogs] = useState<LogEntry[]>([{ time: now(), msg: "Initialized 20 high-res photos. Ready for upload benchmark.", type: "info" }]);
  const logRef = useRef<HTMLDivElement>(null);
  
  const activeCountRef = useRef(0);
  const memoryRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const addLog = useCallback((msg: string, type: LogEntry["type"] = "info") => {
    setLogs((prev) => [...prev.slice(-49), { time: now(), msg, type }]);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);
  
  // Track peaks
  useEffect(() => {
    if (activeConnections > peakConnections) setPeakConnections(activeConnections);
    if (activeMemory > peakMemory) setPeakMemory(activeMemory);
  }, [activeConnections, activeMemory, peakConnections, peakMemory]);

  function reset() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setTasks(generateDummyFiles(20));
    setRunningNaive(false);
    setRunningSemaphore(false);
    setNaiveDone(false);
    setSemaDone(false);
    setActiveConnections(0);
    setPeakConnections(0);
    setActiveMemory(0);
    setPeakMemory(0);
    activeCountRef.current = 0;
    memoryRef.current = 0;
    setLogs([{ time: now(), msg: "Reset complete.", type: "info" }]);
  }

  // Simulate network upload for a single file
  async function simulateUpload(taskId: string, sizeMB: number, signal: AbortSignal, stallMultiplier: number = 1) {
    // Memory is allocated as soon as we start processing the file
    memoryRef.current += sizeMB;
    setActiveMemory(memoryRef.current);
    
    // Connection is opened
    activeCountRef.current += 1;
    setActiveConnections(activeCountRef.current);
    
    let progress = 0;
    // Base upload speed: ~20MB/s, but stalls if there are too many concurrent connections
    const durationMs = (sizeMB / 20) * 1000 * stallMultiplier; 
    const stepTime = 100;
    const steps = durationMs / stepTime;
    const progressPerStep = 100 / steps;

    try {
      while (progress < 100) {
        if (signal.aborted) throw new Error("Aborted");
        await new Promise((r) => setTimeout(r, stepTime));
        progress = Math.min(100, progress + progressPerStep);
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, progress } : t));
      }
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, state: "done", progress: 100 } : t));
    } catch (err) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, state: "error" } : t));
    } finally {
      activeCountRef.current -= 1;
      setActiveConnections(activeCountRef.current);
      memoryRef.current -= sizeMB;
      setActiveMemory(memoryRef.current);
    }
  }

  // Naive Promise.all approach
  async function runNaive() {
    if (runningNaive || runningSemaphore) return;
    
    reset();
    setRunningNaive(true);
    addLog("Starting Promise.all(). Firing all 20 uploads simultaneously...", "warn");
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    // Set all to uploading instantly
    setTasks(prev => prev.map(t => ({ ...t, state: "uploading", progress: 0 })));
    
    // Because we are firing 20 connections at once, the browser network stack gets congested.
    // We simulate this by heavily multiplying the upload duration for ALL requests.
    const stallMultiplier = 4.5; 
    
    addLog(`DANGER: Holding ${tasks.reduce((acc, t) => acc + t.sizeMB, 0).toFixed(0)}MB in active memory.`, "err");
    addLog("WARNING: Browser connection limit (6) exceeded. Uploads are stalling.", "err");

    const start = performance.now();
    
    try {
      await Promise.all(
        tasks.map(t => simulateUpload(t.id, t.sizeMB, signal, stallMultiplier))
      );
      if (!signal.aborted) {
        setNaiveDone(true);
        addLog(`Promise.all() finished in ${((performance.now() - start) / 1000).toFixed(1)}s. Heavy memory pressure recorded.`, "info");
      }
    } catch (e) {
      addLog("Upload aborted.", "warn");
    } finally {
      setRunningNaive(false);
    }
  }

  // Semaphore approach
  async function runSemaphore() {
    if (runningNaive || runningSemaphore) return;
    
    reset();
    setRunningSemaphore(true);
    addLog("Starting Semaphore. Limiting active uploads to exactly 3...", "ok");
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    // Set all to queued
    setTasks(prev => prev.map(t => ({ ...t, state: "queued", progress: 0 })));
    
    const start = performance.now();
    
    // Semaphore Implementation logic for the demo
    const MAX_CONCURRENT = 3;
    let active = 0;
    const queue = [...tasks];
    
    return new Promise<void>((resolve) => {
      
      const pump = async () => {
        if (signal.aborted) return resolve();
        if (queue.length === 0 && active === 0) {
           setSemaDone(true);
           addLog(`Semaphore finished in ${((performance.now() - start) / 1000).toFixed(1)}s. Memory stayed flat!`, "ok");
           setRunningSemaphore(false);
           resolve();
           return;
        }
        
        while (active < MAX_CONCURRENT && queue.length > 0) {
          const task = queue.shift()!;
          active++;
          
          // Update state to active
          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, state: "uploading" } : t));
          
          // Execute upload without congestion multiplier
          simulateUpload(task.id, task.sizeMB, signal, 1).then(() => {
            active--;
            pump(); // recursive trigger
          });
        }
      };
      
      pump();
    });
  }

  const doneCount = tasks.filter(t => t.state === "done").length;
  const isRunning = runningNaive || runningSemaphore;

  return (
    <div className="my-8 font-sans">
      
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 m-0">The Benchmark: Promise.all vs Semaphore</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-0">
          Watch what happens to browser memory and network congestion when we fire 20 heavy image uploads simultaneously vs controlling the concurrency.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
        
        <div className="p-6">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <button
              onClick={runNaive}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 disabled:opacity-50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 text-xs font-bold rounded-lg transition-colors"
            >
              <AlertTriangle size={14} />
              Run Promise.all()
            </button>
            <button
              onClick={runSemaphore}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 disabled:opacity-50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 text-xs font-bold rounded-lg transition-colors"
            >
              <ShieldCheck size={14} />
              Run Semaphore (Max 3)
            </button>
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg transition-colors ml-auto"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          </div>

          {/* Live Telemetry Panel */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <MetricCard 
              label="Active Uploads" 
              value={`${activeConnections}`} 
              subtext="Connections" 
              accent={activeConnections > 6 ? "red" : activeConnections > 0 ? "blue" : undefined}
            />
            <MetricCard 
              label="JS Heap Memory" 
              value={`${Math.round(activeMemory)} MB`} 
              subtext="Allocated" 
              accent={activeMemory > 50 ? "red" : activeMemory > 0 ? "blue" : undefined}
            />
            <MetricCard 
              label="Peak Memory Spiked" 
              value={`${Math.round(peakMemory)} MB`} 
              subtext="Max RAM Usage"
              accent={peakMemory > 50 ? "red" : peakMemory > 0 ? "amber" : undefined}
            />
            <MetricCard 
              label="Completed" 
              value={`${doneCount} / 20`} 
              subtext="Photos Uploaded"
              accent={doneCount === 20 ? "green" : undefined}
            />
          </div>

          {/* Main Visualizer Area */}
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 bg-gray-50/50 dark:bg-gray-900/50">
             <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Photo Queue (20 Files)</span>
                {runningNaive && (
                  <span className="ml-auto text-[9px] px-2 py-1 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle size={10} /> Congestion: High
                  </span>
                )}
                {runningSemaphore && (
                  <span className="ml-auto text-[9px] px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck size={10} /> Congestion: Zero
                  </span>
                )}
             </div>
             
             {/* Dynamic Grid */}
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
               {tasks.map((task) => (
                 <FileCard key={task.id} task={task} />
               ))}
             </div>
          </div>

        </div>

        {/* Logs Console */}
        <div className="bg-gray-950 p-4 border-t border-gray-800">
          <div className="flex items-center gap-2 mb-3 border-b border-gray-800 pb-2">
            <Activity className="text-blue-500" size={14} />
            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Network & Memory Console</span>
          </div>
          
          <div ref={logRef} className="h-[140px] overflow-y-auto font-mono text-[11px] pr-2 custom-scrollbar">
            {logs.map((l, i) => (
              <div
                key={i}
                className={`flex gap-3 mb-1.5 ${
                  l.type === "ok" ? "text-emerald-400"
                  : l.type === "warn" ? "text-amber-400"
                  : l.type === "err" ? "text-red-400"
                  : "text-gray-400"
                }`}
              >
                <span className="opacity-40 shrink-0 font-semibold tracking-wide">[{l.time}]</span>
                <span className="leading-tight">{l.msg}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
