"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { UploadCloud, Play, RotateCcw, Activity, Cpu, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImageEntry {
  name: string;
  state: "idle" | "processing" | "done" | "error";
  ms?: number;
}

interface Timing {
  name: string;
  ms: number;
  mode: "main" | "worker";
}

interface LogEntry {
  time: string;
  msg: string;
  type: "ok" | "warn" | "err" | "";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now() {
  return new Date().toLocaleTimeString();
}

function fmtMs(ms: number) {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function simulateCPUWork(ms: number) {
  const end = performance.now() + ms;
  let x = 0;
  while (performance.now() < end) x += Math.sqrt(x + 1);
  return x;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner({ frozen }: { frozen: boolean }) {
  return (
    <span
      className="shrink-0 rounded-full border-2 transition-colors duration-150"
      style={{
        display: "inline-block",
        width: 18,
        height: 18,
        borderColor: frozen 
          ? "rgb(248 113 113) rgb(248 113 113) rgb(248 113 113) transparent" 
          : "rgb(156 163 175) rgb(156 163 175) rgb(156 163 175) transparent",
        animation: frozen ? "none" : "spin 0.7s linear infinite",
      }}
    />
  );
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent?: "green" | "amber" | "red" }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3 flex-1 min-w-[100px]">
      <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
        {label}
      </div>
      <div
        className={`text-xl font-bold font-mono tabular-nums ${
          accent === "green"
            ? "text-emerald-500"
            : accent === "red"
            ? "text-red-500"
            : accent === "amber"
            ? "text-amber-500"
            : "text-gray-900 dark:text-gray-100"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function ImageCard({ entry }: { entry: ImageEntry }) {
  const isProc = entry.state === "processing";
  const isDone = entry.state === "done";
  const isErr = entry.state === "error";

  return (
    <div
      className={`aspect-square flex flex-col items-center justify-center gap-1 p-1 relative rounded-md border transition-colors overflow-hidden ${
        isProc
          ? "bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30"
          : isDone
          ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/30"
          : isErr
          ? "bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30"
          : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
      }`}
    >
      {isProc ? (
        <Loader2 className="animate-spin text-amber-500" size={16} />
      ) : isDone ? (
        <CheckCircle2 className="text-emerald-500" size={16} />
      ) : isErr ? (
        <AlertTriangle className="text-red-500" size={16} />
      ) : (
        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
      )}
      
      <span className="text-[9px] text-gray-500 dark:text-gray-400 text-center truncate w-full px-0.5 leading-tight">
        {entry.name.length > 12 ? entry.name.slice(0, 10) + "…" : entry.name}
      </span>
      
      {entry.ms !== undefined && (
        <span className="absolute bottom-1 right-1 text-[8px] bg-black/40 text-white rounded px-1 font-mono tabular-nums">
          {fmtMs(entry.ms)}
        </span>
      )}
    </div>
  );
}

function TimelineBar({ timing, maxMs, mode }: { timing: Timing; maxMs: number; mode: "main" | "worker" }) {
  const pct = Math.round((timing.ms / Math.max(maxMs, 1)) * 100);
  const colorClass = mode === "main" ? "bg-red-400 dark:bg-red-500" : "bg-emerald-400 dark:bg-emerald-500";
  
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className="w-20 text-[10px] text-gray-500 dark:text-gray-400 truncate shrink-0">
        {timing.name.length > 10 ? timing.name.slice(0, 8) + "…" : timing.name}
      </span>
      <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-12 text-[10px] text-gray-500 dark:text-gray-400 text-right font-mono tabular-nums shrink-0">
        {fmtMs(timing.ms)}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HeicBenchmark() {
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);

  const [mainEntries, setMainEntries] = useState<ImageEntry[]>([]);
  const [workerEntries, setWorkerEntries] = useState<ImageEntry[]>([]);

  const [mainTimings, setMainTimings] = useState<Timing[]>([]);
  const [workerTimings, setWorkerTimings] = useState<Timing[]>([]);

  const [mainTotal, setMainTotal] = useState<number | null>(null);
  const [workerTotal, setWorkerTotal] = useState<number | null>(null);

  const [mainDone, setMainDone] = useState(0);
  const [workerDone, setWorkerDone] = useState(0);

  const [frozen, setFrozen] = useState(false);
  const [runningMain, setRunningMain] = useState(false);
  const [runningWorker, setRunningWorker] = useState(false);

  const [logs, setLogs] = useState<LogEntry[]>([{ time: now(), msg: "Ready. Drop some photos to start.", type: "ok" }]);
  const logRef = useRef<HTMLDivElement>(null);

  const lastRAF = useRef(Date.now());
  const currentMode = useRef<"main" | "worker" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = useCallback((msg: string, type: LogEntry["type"] = "") => {
    setLogs((prev) => [...prev.slice(-49), { time: now(), msg, type }]);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  // RAF freeze monitor
  useEffect(() => {
    let rafId: number;
    function loop() {
      const now2 = Date.now();
      const delta = now2 - lastRAF.current;
      lastRAF.current = now2;
      if (delta > 180 && currentMode.current === "main") {
        setFrozen(true);
      } else {
        setFrozen(false);
      }
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  function handleFiles(incoming: File[]) {
    const clamped = incoming.slice(0, 20);
    setFiles(clamped);
    setMainEntries(clamped.map((f) => ({ name: f.name, state: "idle" })));
    setWorkerEntries(clamped.map((f) => ({ name: f.name, state: "idle" })));
    setMainTimings([]);
    setWorkerTimings([]);
    setMainTotal(null);
    setWorkerTotal(null);
    setMainDone(0);
    setWorkerDone(0);
    addLog(`${clamped.length} photos loaded. Ready to run.`, "ok");
  }

  function reset() {
    setFiles([]);
    setMainEntries([]);
    setWorkerEntries([]);
    setMainTimings([]);
    setWorkerTimings([]);
    setMainTotal(null);
    setWorkerTotal(null);
    setMainDone(0);
    setWorkerDone(0);
    setFrozen(false);
    setLogs([{ time: now(), msg: "Reset.", type: "ok" }]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function runMainThread() {
    if (!files.length || runningMain) return;
    setRunningMain(true);
    currentMode.current = "main";
    setMainDone(0);
    setMainTimings([]);
    setMainTotal(null);
    setMainEntries(files.map((f) => ({ name: f.name, state: "idle" })));
    addLog(`Main thread running. Parsing EXIF & converting ${files.length} files synchronously`, "warn");
    const timings: Timing[] = [];
    const start = performance.now();
    
    // Dynamic import to avoid SSR issues
    const exifr = (await import("exifr")).default;
    let heic2any: typeof import("heic2any")["default"] | undefined; 

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      setMainEntries((prev) => prev.map((e) => e.name === f.name ? { ...e, state: "processing" } : e));
      await new Promise<void>((r) => setTimeout(r, 0)); // yield to let React paint processing state

      const fileStart = performance.now();
      try {
        await exifr.parse(f, { pick: ["DateTimeOriginal", "CreateDate"] });
        
        const isHeic = f.name.toLowerCase().endsWith(".heic") || f.name.toLowerCase().endsWith(".heif");
        if (isHeic) {
          if (!heic2any) heic2any = (await import("heic2any")).default;
          await heic2any!({ blob: f, toType: "image/jpeg", quality: 0.8 });
        } else {
           // Simulate HEIC decode cost for non-HEIC files so the benchmark remains accessible
           simulateCPUWork(800);
        }
      } catch (err: any) {
        addLog(`Error on ${f.name}: ${err?.message ?? String(err)}`, "err");
        setMainEntries((prev) =>
          prev.map((e) => e.name === f.name ? { ...e, state: "error" } : e)
        );
      }

      const elapsed = Math.round(performance.now() - fileStart);
      timings.push({ name: f.name, ms: elapsed, mode: "main" });
      setMainEntries((prev) => prev.map((e) => e.name === f.name ? { ...e, state: "done", ms: elapsed } : e));
      setMainDone(i + 1);
      await new Promise<void>((r) => setTimeout(r, 0)); // yield
    }

    const total = Math.round(performance.now() - start);
    setMainTotal(total);
    setMainTimings(timings);
    currentMode.current = null;
    setFrozen(false);
    setRunningMain(false);
    addLog(`Main thread finished in ${(total / 1000).toFixed(1)}s.`, "warn");
  }

  async function runWithWorkers() {
    if (!files.length || runningWorker) return;
    setRunningWorker(true);
    currentMode.current = "worker";
    setWorkerDone(0);
    setWorkerTimings([]);
    setWorkerTotal(null);
    setWorkerEntries(files.map((f) => ({ name: f.name, state: "idle" })));

    const poolSize = Math.min(files.length, Math.max(2, (navigator.hardwareConcurrency || 4) - 1));
    addLog(`Distributing ${files.length} photos across ${poolSize} background workers based on your ${navigator.hardwareConcurrency ?? "?"} CPU cores.`, "ok");

    const workers = Array.from({ length: poolSize }, () => new Worker(new URL('./heic.worker.ts', import.meta.url)));
    const timings: Timing[] = [];
    const start = performance.now();

    await new Promise<void>((resolve, reject) => {
      let nextIdx = 0;
      let finished = 0;
      let hasError = false;

      function dispatch(worker: Worker) {
        if (hasError) return;
        if (nextIdx >= files.length) return;
        const idx = nextIdx++;
        const f = files[idx];
        setWorkerEntries((prev) => prev.map((e) => e.name === f.name ? { ...e, state: "processing" } : e));
        worker.postMessage({ name: f.name, file: f, id: idx });
      }

      workers.forEach((w) => {
        w.onerror = (err) => {
          addLog(`Worker failed: ${err.message}`, "err");
          hasError = true;
          resolve();
        };

        w.onmessage = (e) => {
          if (hasError) return;
          
          if (e.data.type === 'fatal') {
             addLog(`Worker error: ${e.data.error}`, "err");
             hasError = true;
             resolve();
             return;
          }

          if (e.data.type === 'error') {
             addLog(`Error processing ${e.data.name}: ${e.data.error}`, "err");
             setWorkerEntries((prev) => prev.map((en) => en.name === e.data.name ? { ...en, state: "error" } : en));
             // Don't halt everything, just continue
          }

          if (e.data.type === 'success') {
            const { name, elapsed } = e.data;
            timings.push({ name, ms: elapsed, mode: "worker" });
            setWorkerEntries((prev) => prev.map((en) => en.name === name ? { ...en, state: "done", ms: elapsed } : en));
          }

          setWorkerDone((d) => d + 1);
          finished++;
          if (finished === files.length) resolve();
          else dispatch(w);
        };
        dispatch(w);
      });
    });

    workers.forEach((w) => w.terminate());

    const total = Math.round(performance.now() - start);
    setWorkerTotal(total);
    setWorkerTimings(timings);
    currentMode.current = null;
    setRunningWorker(false);
    addLog(`Workers finished in ${(total / 1000).toFixed(1)}s. Notice how the spinner never stopped?`, "ok");
  }

  const allMainTimings = mainTimings;
  const allWorkerTimings = workerTimings;
  const maxTimingMs = Math.max(...allMainTimings.map((t) => t.ms), ...allWorkerTimings.map((t) => t.ms), 1);
  const showTimeline = allMainTimings.length > 0 || allWorkerTimings.length > 0;
  const showComparison = mainTotal !== null || workerTotal !== null;

  const speedup = mainTotal && workerTotal ? (mainTotal / workerTotal).toFixed(1) : null;

  return (
    <div className="my-8 font-sans">
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
        
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 p-5 md:p-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 m-0">
            Main Thread vs Web Workers
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-0 leading-relaxed">
            Drop some HEIC photos below to see the difference. Watch the spinner when the browser locks up, and compare the total time it takes to process the files.
            <br/>
            <span className="opacity-80 inline-block mt-1">
              (Relax, your photos never leave your device. Everything happens locally in your browser. 
              You don&apos;t have to trust me. <a href="https://github.com/SouravInsights/souravinsights.com/tree/main/src/app/blog/components/HeicBenchmark.tsx" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-900 dark:hover:text-gray-200">Peek at the source code</a>.)
            </span>
          </p>
        </div>
        
        <div className="p-5 md:p-6">
          {/* Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFiles(Array.from(e.dataTransfer.files));
            }}
            className={`
              flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors mb-6
              ${dragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900'}
            `}
          >
            <UploadCloud className="text-gray-400 mb-3" size={28} />
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Drag & Drop images here
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Any format works • Up to 20 files
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFiles(Array.from(e.target.files ?? []))}
            />
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <button
              onClick={runMainThread}
              disabled={!files.length || runningMain || runningWorker}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:hover:bg-red-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Play size={14} />
              {runningMain ? "Running..." : "Run on Main Thread"}
            </button>
            <button
              onClick={runWithWorkers}
              disabled={!files.length || runningMain || runningWorker}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Cpu size={14} />
              {runningWorker ? "Running..." : "Run in Web Workers"}
            </button>
            <button
              onClick={reset}
              disabled={runningMain || runningWorker}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg transition-colors ml-auto"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          </div>

          {/* Metrics Row */}
          <div className="flex flex-wrap gap-3 mb-6">
            <MetricCard label="Queue" value={String(files.length || "—")} />
            <MetricCard label="Main Done" value={`${mainDone}/${files.length || 0}`} accent={runningMain ? "amber" : undefined} />
            <MetricCard label="Worker Done" value={`${workerDone}/${files.length || 0}`} accent={runningWorker ? "amber" : undefined} />
            <MetricCard label="Spinner" value={frozen ? "Frozen" : "Spinning"} accent={frozen ? "red" : "green"} />
          </div>

          {/* Freeze Monitor */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg mb-6">
            <Spinner frozen={frozen} />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Watch the spinner. If the main thread is blocked, it stops spinning.
            </span>
          </div>

          {/* Execution Panels */}
          {files.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              
              {/* Main Thread Panel */}
              <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 bg-gray-50/50 dark:bg-gray-900/50">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Main Thread</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold uppercase tracking-wider">
                    Blocking
                  </span>
                  {mainTotal !== null && (
                    <span className="ml-auto text-[11px] font-mono text-red-500 tabular-nums font-bold">
                      {fmtMs(mainTotal)}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {mainEntries.map((e) => (
                    <ImageCard key={e.name} entry={e} />
                  ))}
                </div>
              </div>

              {/* Worker Panel */}
              <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 bg-gray-50/50 dark:bg-gray-900/50">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Worker Pool</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                    Non-blocking
                  </span>
                  {workerTotal !== null && (
                    <span className="ml-auto text-[11px] font-mono text-emerald-500 tabular-nums font-bold">
                      {fmtMs(workerTotal)}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {workerEntries.map((e) => (
                    <ImageCard key={e.name} entry={e} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          {showTimeline && (
            <div className="mb-6">
              <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Per-image Timeline
              </div>
              <div className="space-y-1">
                {allMainTimings.map((t) => (
                  <TimelineBar key={"m-" + t.name} timing={t} maxMs={maxTimingMs} mode="main" />
                ))}
                {allWorkerTimings.map((t) => (
                  <TimelineBar key={"w-" + t.name} timing={t} maxMs={maxTimingMs} mode="worker" />
                ))}
              </div>
            </div>
          )}

          {/* Comparison Banner */}
          {showComparison && (
            <div className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-6 flex flex-wrap items-center justify-between gap-6 mb-6 shadow-sm">
              <div className="flex items-center gap-8">
                <div>
                  <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Main Thread</div>
                  <div className="text-2xl font-bold text-red-500 font-mono tabular-nums">
                    {mainTotal ? fmtMs(mainTotal) : "—"}
                  </div>
                </div>
                <div className="text-lg text-gray-400 font-medium italic">vs</div>
                <div>
                  <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Web Workers</div>
                  <div className="text-2xl font-bold text-emerald-500 font-mono tabular-nums">
                    {workerTotal ? fmtMs(workerTotal) : "—"}
                  </div>
                </div>
              </div>
              
              {speedup && (
                <div className="text-sm text-gray-600 dark:text-gray-300 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                  The web workers finished <span className="font-bold text-emerald-600 dark:text-emerald-400">{speedup}×</span> faster because they used all {navigator.hardwareConcurrency ?? "?"} cores on your machine.
                </div>
              )}
            </div>
          )}

        </div>

        {/* Logs Console */}
        <div className="bg-gray-900 p-4 border-t border-gray-800">
          <div className="flex items-center gap-2 mb-3 border-b border-gray-800 pb-2">
            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Logs</span>
          </div>
          
          <div ref={logRef} className="h-[120px] overflow-y-auto font-mono text-[11px] pr-2 custom-scrollbar">
            {logs.map((l, i) => (
              <div
                key={i}
                className={`flex gap-2 mb-1 ${
                  l.type === "ok" ? "text-emerald-400"
                  : l.type === "warn" ? "text-amber-400"
                  : l.type === "err" ? "text-red-400"
                  : "text-gray-400"
                }`}
              >
                <span className="opacity-40 shrink-0">[{l.time}]</span>
                <span>{l.msg}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}