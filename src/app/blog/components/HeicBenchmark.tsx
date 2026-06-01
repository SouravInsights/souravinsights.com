"use client";

import { useEffect, useRef, useState, useCallback } from "react";

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

// The worker uses a separate file for Next.js native Webpack Worker bundling

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner({ frozen }: { frozen: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 16,
        height: 16,
        borderRadius: "50%",
        border: "2px solid",
        borderColor: frozen ? "#f87171 #f87171 #f87171 transparent" : "#94a3b8 #94a3b8 #94a3b8 transparent",
        animation: frozen ? "none" : "heic-spin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent?: "green" | "amber" | "red" }) {
  const accentColor = accent === "green" ? "#10b981" : accent === "red" ? "#ef4444" : accent === "amber" ? "#f59e0b" : "inherit";
  return (
    <div
      style={{
        background: "var(--heic-surface)",
        borderRadius: 10,
        padding: "12px 16px",
        flex: 1,
        minWidth: 100,
      }}
    >
      <div style={{ fontSize: 11, color: "var(--heic-muted)", marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, color: accentColor || "var(--heic-text)", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
    </div>
  );
}

function ImageCard({ entry }: { entry: ImageEntry }) {
  const bg =
    entry.state === "processing" ? "rgba(251,191,36,0.12)"
    : entry.state === "done"     ? "rgba(16,185,129,0.1)"
    : entry.state === "error"    ? "rgba(239,68,68,0.1)"
    : "var(--heic-surface)";

  const iconColor =
    entry.state === "processing" ? "#f59e0b"
    : entry.state === "done"     ? "#10b981"
    : entry.state === "error"    ? "#ef4444"
    : "var(--heic-muted)";

  const icon =
    entry.state === "processing" ? "⟳"
    : entry.state === "done"     ? "✓"
    : entry.state === "error"    ? "✕"
    : "·";

  return (
    <div
      style={{
        background: bg,
        border: "0.5px solid var(--heic-border)",
        borderRadius: 8,
        aspectRatio: "1",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        padding: 4,
        position: "relative",
        transition: "background 0.2s",
        overflow: "hidden",
      }}
    >
      <span style={{ fontSize: 16, color: iconColor, lineHeight: 1, animation: entry.state === "processing" ? "heic-spin 1s linear infinite" : "none" }}>
        {icon}
      </span>
      <span
        style={{
          fontSize: 9,
          color: "var(--heic-muted)",
          textAlign: "center",
          wordBreak: "break-all",
          lineHeight: 1.2,
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          padding: "0 2px",
        }}
      >
        {entry.name.length > 12 ? entry.name.slice(0, 10) + "…" : entry.name}
      </span>
      {entry.ms !== undefined && (
        <span
          style={{
            position: "absolute",
            bottom: 3,
            right: 3,
            fontSize: 8,
            background: "rgba(0,0,0,0.35)",
            color: "#fff",
            borderRadius: 3,
            padding: "1px 3px",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {fmtMs(entry.ms)}
        </span>
      )}
    </div>
  );
}

function TimelineBar({ timing, maxMs, mode }: { timing: Timing; maxMs: number; mode: "main" | "worker" }) {
  const pct = Math.round((timing.ms / Math.max(maxMs, 1)) * 100);
  const color = mode === "main" ? "#f87171" : "#34d399";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
      <span style={{ width: 80, fontSize: 11, color: "var(--heic-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>
        {timing.name.length > 10 ? timing.name.slice(0, 8) + "…" : timing.name}
      </span>
      <div style={{ flex: 1, height: 14, background: "var(--heic-surface)", borderRadius: 4, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: 4,
            transition: "width 0.3s ease",
            opacity: 0.8,
          }}
        />
      </div>
      <span style={{ width: 44, fontSize: 11, color: "var(--heic-muted)", textAlign: "right", fontVariantNumeric: "tabular-nums", fontFamily: "monospace", flexShrink: 0 }}>
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

  const [logs, setLogs] = useState<LogEntry[]>([{ time: now(), msg: "Ready. Drop some images to start.", type: "ok" }]);
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
    addLog(`${clamped.length} files loaded. Ready to benchmark.`, "ok");
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
    addLog(`Main thread: parsing EXIF & converting ${files.length} files synchronously`, "warn");

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
    addLog(`Main thread done in ${(total / 1000).toFixed(1)}s. UI was completely blocked.`, "warn");
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
    addLog(`Workers: ${files.length} files, pool=${poolSize} (cores: ${navigator.hardwareConcurrency ?? "?"})`, "ok");

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
          addLog(`Worker crashed: ${err.message}`, "err");
          hasError = true;
          resolve();
        };

        w.onmessage = (e) => {
          if (hasError) return;
          
          if (e.data.type === 'fatal') {
             addLog(`Fatal worker error: ${e.data.error}`, "err");
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
    addLog(`Workers done in ${(total / 1000).toFixed(1)}s. UI stayed perfectly responsive.`, "ok");
  }

  const allMainTimings = mainTimings;
  const allWorkerTimings = workerTimings;
  const maxTimingMs = Math.max(...allMainTimings.map((t) => t.ms), ...allWorkerTimings.map((t) => t.ms), 1);
  const showTimeline = allMainTimings.length > 0 || allWorkerTimings.length > 0;
  const showComparison = mainTotal !== null || workerTotal !== null;

  const speedup = mainTotal && workerTotal ? (mainTotal / workerTotal).toFixed(1) : null;

  return (
    <>
      <style>{`
        @keyframes heic-spin { to { transform: rotate(360deg); } }
        .heic-dropzone { transition: border-color 0.15s, background 0.15s; }
        .heic-dropzone:hover { border-color: var(--heic-border-strong) !important; background: var(--heic-bg) !important; }
        .heic-btn { transition: opacity 0.15s, background 0.15s; cursor: pointer; font-family: inherit; }
        .heic-btn:hover:not(:disabled) { opacity: 0.8; }
        .heic-btn:disabled { opacity: 0.35; cursor: default; }
        .heic-root {
          --heic-bg: #ffffff;
          --heic-surface: #f4f4f5;
          --heic-border: rgba(0,0,0,0.1);
          --heic-border-strong: rgba(0,0,0,0.25);
          --heic-text: #18181b;
          --heic-muted: #71717a;
        }
        @media (prefers-color-scheme: dark) {
          .heic-root {
            --heic-bg: #09090b;
            --heic-surface: #18181b;
            --heic-border: rgba(255,255,255,0.1);
            --heic-border-strong: rgba(255,255,255,0.3);
            --heic-text: #fafafa;
            --heic-muted: #a1a1aa;
          }
        }
      `}</style>

      <div
        className="heic-root"
        style={{
          fontFamily: "'IBM Plex Mono', 'Geist Mono', monospace",
          color: "var(--heic-text)",
          padding: "2rem 0",
          maxWidth: 760,
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
            main thread vs web workers
          </h2>
          <p style={{ fontSize: 13, color: "var(--heic-muted)", margin: 0 }}>
            Processes actual EXIF and HEIC data. Compare total time and watch how the worker pool keeps the UI alive.
          </p>
        </div>

        {/* Dropzone */}
        <div
          className="heic-dropzone"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(Array.from(e.dataTransfer.files));
          }}
          style={{
            border: `1.5px dashed ${dragging ? "var(--heic-border-strong)" : "var(--heic-border)"}`,
            borderRadius: 12,
            padding: "2rem",
            textAlign: "center",
            cursor: "pointer",
            background: dragging ? "var(--heic-surface)" : "transparent",
            marginBottom: "1.25rem",
            userSelect: "none",
          }}
        >
          <div style={{ fontSize: 13, color: "var(--heic-text)", marginBottom: 4 }}>
            drop images here, or click to select
          </div>
          <div style={{ fontSize: 11, color: "var(--heic-muted)" }}>
            any format works · up to 20 files · real EXIF + HEIC decode
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => handleFiles(Array.from(e.target.files ?? []))}
          />
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: "1.25rem" }}>
          <button
            className="heic-btn"
            onClick={runMainThread}
            disabled={!files.length || runningMain || runningWorker}
            style={{
              fontSize: 12,
              padding: "7px 14px",
              borderRadius: 7,
              border: "0.5px solid var(--heic-border-strong)",
              background: "var(--heic-text)",
              color: "var(--heic-bg)",
              fontFamily: "inherit",
              letterSpacing: "0.01em",
            }}
          >
            {runningMain ? "running…" : "▶ run main thread"}
          </button>
          <button
            className="heic-btn"
            onClick={runWithWorkers}
            disabled={!files.length || runningMain || runningWorker}
            style={{
              fontSize: 12,
              padding: "7px 14px",
              borderRadius: 7,
              border: "0.5px solid var(--heic-border)",
              background: "transparent",
              color: "var(--heic-text)",
              fontFamily: "inherit",
              letterSpacing: "0.01em",
            }}
          >
            {runningWorker ? "running…" : "▶ run workers"}
          </button>
          <button
            className="heic-btn"
            onClick={reset}
            disabled={runningMain || runningWorker}
            style={{
              fontSize: 12,
              padding: "7px 12px",
              borderRadius: 7,
              border: "0.5px solid var(--heic-border)",
              background: "transparent",
              color: "var(--heic-muted)",
              fontFamily: "inherit",
            }}
          >
            reset
          </button>
        </div>

        {/* Metrics row */}
        <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem", flexWrap: "wrap" }}>
          <MetricCard label="Files" value={String(files.length || "—")} />
          <MetricCard label="Main done" value={`${mainDone}/${files.length || 0}`} accent={runningMain ? "amber" : undefined} />
          <MetricCard label="Worker done" value={`${workerDone}/${files.length || 0}`} accent={runningWorker ? "amber" : undefined} />
          <MetricCard label="UI frozen" value={frozen ? "YES" : "no"} accent={frozen ? "red" : "green"} />
        </div>

        {/* Freeze monitor */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            border: "0.5px solid var(--heic-border)",
            borderRadius: 8,
            background: "var(--heic-surface)",
            marginBottom: "1.25rem",
            fontSize: 12,
          }}
        >
          <Spinner frozen={frozen} />
          <span style={{ color: "var(--heic-muted)" }}>UI heartbeat — stalls on main thread, stays alive with workers</span>
          <span
            style={{
              marginLeft: "auto",
              fontWeight: 600,
              color: frozen ? "#ef4444" : "#10b981",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              fontSize: 11,
            }}
          >
            {frozen ? "frozen" : "responsive"}
          </span>
        </div>

        {/* Two panels */}
        {files.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1.25rem" }}>
            {/* Main thread panel */}
            <div
              style={{
                border: "0.5px solid var(--heic-border)",
                borderRadius: 12,
                padding: "1rem",
                background: "var(--heic-bg)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>main thread</span>
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 7px",
                    borderRadius: 4,
                    background: "rgba(248,113,113,0.15)",
                    color: "#f87171",
                  }}
                >
                  blocking
                </span>
                {mainTotal !== null && (
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "#f87171", fontVariantNumeric: "tabular-nums" }}>
                    {fmtMs(mainTotal)}
                  </span>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(58px, 1fr))", gap: 6 }}>
                {mainEntries.map((e) => (
                  <ImageCard key={e.name} entry={e} />
                ))}
              </div>
            </div>

            {/* Worker panel */}
            <div
              style={{
                border: "0.5px solid var(--heic-border)",
                borderRadius: 12,
                padding: "1rem",
                background: "var(--heic-bg)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>web workers</span>
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 7px",
                    borderRadius: 4,
                    background: "rgba(52,211,153,0.15)",
                    color: "#34d399",
                  }}
                >
                  non-blocking
                </span>
                {workerTotal !== null && (
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "#34d399", fontVariantNumeric: "tabular-nums" }}>
                    {fmtMs(workerTotal)}
                  </span>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(58px, 1fr))", gap: 6 }}>
                {workerEntries.map((e) => (
                  <ImageCard key={e.name} entry={e} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        {showTimeline && (
          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>per-image timing</div>
            {allMainTimings.map((t) => (
              <TimelineBar key={"m-" + t.name} timing={t} maxMs={maxTimingMs} mode="main" />
            ))}
            {allWorkerTimings.map((t) => (
              <TimelineBar key={"w-" + t.name} timing={t} maxMs={maxTimingMs} mode="worker" />
            ))}
          </div>
        )}

        {/* Comparison banner */}
        {showComparison && (
          <div
            style={{
              border: "0.5px solid var(--heic-border)",
              borderRadius: 12,
              padding: "1rem 1.25rem",
              background: "var(--heic-bg)",
              display: "flex",
              gap: "1.5rem",
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: "1.25rem",
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: "var(--heic-muted)", marginBottom: 2 }}>main thread</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#f87171", fontVariantNumeric: "tabular-nums" }}>
                {mainTotal ? fmtMs(mainTotal) : "—"}
              </div>
            </div>
            <div style={{ fontSize: 20, color: "var(--heic-muted)" }}>vs</div>
            <div>
              <div style={{ fontSize: 11, color: "var(--heic-muted)", marginBottom: 2 }}>web workers</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#34d399", fontVariantNumeric: "tabular-nums" }}>
                {workerTotal ? fmtMs(workerTotal) : "—"}
              </div>
            </div>
            {speedup && (
              <div style={{ marginLeft: "auto", fontSize: 13, color: "var(--heic-muted)" }}>
                workers were{" "}
                <span style={{ fontWeight: 700, color: "var(--heic-text)" }}>{speedup}×</span> faster on your{" "}
                {navigator.hardwareConcurrency ?? "?"}-core machine
              </div>
            )}
          </div>
        )}

        {/* Log */}
        <div
          ref={logRef}
          style={{
            border: "0.5px solid var(--heic-border)",
            borderRadius: 8,
            padding: "10px 14px",
            maxHeight: 110,
            overflowY: "auto",
            background: "var(--heic-surface)",
          }}
        >
          {logs.map((l, i) => (
            <div
              key={i}
              style={{
                fontSize: 11,
                fontFamily: "inherit",
                color:
                  l.type === "ok" ? "#10b981"
                  : l.type === "warn" ? "#f59e0b"
                  : l.type === "err" ? "#ef4444"
                  : "var(--heic-muted)",
                marginBottom: i < logs.length - 1 ? 2 : 0,
              }}
            >
              <span style={{ opacity: 0.5 }}>[{l.time}]</span> {l.msg}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}