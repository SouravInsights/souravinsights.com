"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, RotateCcw, Zap, Cpu } from "lucide-react";

const PHOTO_NAMES = [
  "IMG_0001","IMG_0002","IMG_0003","IMG_0004",
  "IMG_0005","IMG_0006","IMG_0007","IMG_0008",
];
const NAIVE_MAX = 6;
const SEM_MAX = 3;
const TOTAL = 8;

type SlotState = "idle" | "active" | "error" | "done";
type LogType = "ok" | "warn" | "err" | "info" | "";

interface Slot {
  name: string | null;
  progress: number;
  state: SlotState;
}

interface QueueItem {
  name: string;
  variant: "owned" | "browser-hidden" | "idle";
}

interface LogLine {
  msg: string;
  type: LogType;
}

interface PanelState {
  slots: Slot[];
  queue: QueueItem[];
  logs: LogLine[];
  active: number;
  queued: number;
  done: number;
  failed: number;
  outcome: { text: string; type: "good" | "bad" } | null;
}

function emptySlots(count: number): Slot[] {
  return Array.from({ length: count }, () => ({ name: null, progress: 0, state: "idle" }));
}

function initialPanelState(slotCount: number): PanelState {
  return {
    slots: emptySlots(slotCount),
    queue: [],
    logs: [],
    active: 0,
    queued: 0,
    done: 0,
    failed: 0,
    outcome: null,
  };
}

function sleep(ms: number, mult: number) {
  return new Promise<void>((res) => setTimeout(res, ms / mult));
}

function jitter(base: number, variance: number) {
  return base + (Math.random() - 0.5) * variance;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SlotCard({ slot, index }: { slot: Slot; index: number }) {
  const isActive = slot.state === "active" || slot.state === "error" || slot.state === "done";

  const borderColor =
    slot.state === "error"
      ? "border-red-300 dark:border-red-800/60"
      : slot.state === "done"
      ? "border-emerald-300 dark:border-emerald-800/60"
      : isActive
      ? "border-blue-300 dark:border-blue-800/60"
      : "border-gray-200 dark:border-gray-800";

  const bgColor =
    slot.state === "error"
      ? "bg-red-50/60 dark:bg-red-900/10"
      : slot.state === "done"
      ? "bg-emerald-50/60 dark:bg-emerald-900/10"
      : isActive
      ? "bg-blue-50/60 dark:bg-blue-900/10"
      : "bg-gray-50 dark:bg-gray-900/50";

  const labelColor =
    slot.state === "error"
      ? "text-red-500"
      : slot.state === "done"
      ? "text-emerald-500"
      : isActive
      ? "text-blue-500"
      : "text-gray-400 dark:text-gray-600";

  const barColor =
    slot.state === "error"
      ? "bg-red-400"
      : slot.state === "done"
      ? "bg-emerald-400"
      : "bg-blue-400";

  return (
    <div
      className={`flex-1 h-14 rounded-lg border flex flex-col items-center justify-center gap-1.5 px-2 transition-colors duration-200 ${borderColor} ${bgColor}`}
    >
      <span className={`text-[10px] font-mono font-medium truncate max-w-full px-1 ${labelColor}`}>
        {slot.name ?? `slot ${index + 1}`}
      </span>
      <div className="w-4/5 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-100 ${barColor}`}
          style={{ width: `${slot.progress}%` }}
        />
      </div>
    </div>
  );
}

function QueuePill({ item }: { item: QueueItem }) {
  if (item.variant === "owned") {
    return (
      <span className="text-[11px] px-2.5 py-1 rounded-full border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-mono">
        {item.name}
      </span>
    );
  }
  if (item.variant === "browser-hidden") {
    return (
      <span className="text-[11px] px-2.5 py-1 rounded-full border border-dashed border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-600 font-mono italic opacity-60">
        {item.name} (hidden)
      </span>
    );
  }
  return (
    <span className="text-[11px] px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 font-mono">
      {item.name}
    </span>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "red" | "green";
}) {
  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-2.5 text-center">
      <div
        className={`text-lg font-bold font-mono tabular-nums ${
          accent === "red"
            ? "text-red-500"
            : accent === "green"
            ? "text-emerald-500"
            : "text-gray-900 dark:text-gray-100"
        }`}
      >
        {value}
      </div>
      <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-sans mt-0.5">
        {label}
      </div>
    </div>
  );
}

function LogConsole({ lines }: { lines: LogLine[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines]);

  return (
    <div
      ref={ref}
      className="h-24 overflow-y-auto bg-gray-900 rounded-lg p-2.5 font-mono text-[11px] space-y-0.5"
    >
      {lines.length === 0 && (
        <span className="text-gray-600">Waiting to run…</span>
      )}
      {lines.map((l, i) => (
        <div
          key={i}
          className={
            l.type === "ok"
              ? "text-emerald-400"
              : l.type === "err"
              ? "text-red-400"
              : l.type === "warn"
              ? "text-amber-400"
              : l.type === "info"
              ? "text-blue-400"
              : "text-gray-400"
          }
        >
          {l.msg}
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SemaphoreVisualizer() {
  const [speedMult, setSpeedMult] = useState(1);
  const [running, setRunning] = useState(false);
  const [canInjectFail, setCanInjectFail] = useState(false);

  const failInjectedRef = useRef(false);
  const failTargetRef = useRef<string | null>(null);
  const runningRef = useRef(false);

  const [naiveState, setNaiveState] = useState<PanelState>(initialPanelState(NAIVE_MAX));
  const [semState, setSemState] = useState<PanelState>(initialPanelState(SEM_MAX));

  const speedRef = useRef(speedMult);
  useEffect(() => { speedRef.current = speedMult; }, [speedMult]);

  const sleepFn = useCallback((ms: number) => sleep(ms, speedRef.current), []);

  function patchNaive(fn: (prev: PanelState) => PanelState) {
    setNaiveState((prev) => fn(prev));
  }
  function patchSem(fn: (prev: PanelState) => PanelState) {
    setSemState((prev) => fn(prev));
  }

  function addNaiveLog(msg: string, type: LogType = "") {
    patchNaive((p) => ({ ...p, logs: [...p.logs.slice(-60), { msg, type }] }));
  }
  function addSemLog(msg: string, type: LogType = "") {
    patchSem((p) => ({ ...p, logs: [...p.logs.slice(-60), { msg, type }] }));
  }

  function reset() {
    runningRef.current = false;
    failInjectedRef.current = false;
    failTargetRef.current = null;
    setRunning(false);
    setCanInjectFail(false);
    setNaiveState(initialPanelState(NAIVE_MAX));
    setSemState(initialPanelState(SEM_MAX));
  }

  // ─── Naive runner ──────────────────────────────────────────────────────────

  async function runNaive() {
    // Build initial queue display
    const initialQueue: QueueItem[] = [
      ...PHOTO_NAMES.slice(0, NAIVE_MAX).map((n) => ({ name: n, variant: "idle" as const })),
      ...PHOTO_NAMES.slice(NAIVE_MAX).map((n) => ({ name: n, variant: "browser-hidden" as const })),
    ];
    patchNaive((p) => ({ ...p, queue: initialQueue }));
    await sleepFn(300);

    addNaiveLog("Promise.all(8) fired — all 8 requests launched simultaneously", "warn");
    await sleepFn(400);
    addNaiveLog(
      `Browser hard-cap: ${NAIVE_MAX} connections max. ${TOTAL - NAIVE_MAX} go into a queue you cannot see.`,
      "err"
    );

    patchNaive((p) => ({
      ...p,
      queued: TOTAL - NAIVE_MAX,
      queue: initialQueue.map((q) => ({
        ...q,
        variant: q.variant === "idle" ? "idle" : "browser-hidden",
      })),
    }));

    const slotOccupied: (string | null)[] = Array(NAIVE_MAX).fill(null);

    const tasks = PHOTO_NAMES.map((name, idx) => async () => {
      const isImmediate = idx < NAIVE_MAX;

      if (!isImmediate) {
        await sleepFn(jitter(1400, 500));
        if (!runningRef.current) return;
      }

      const slotIdx = isImmediate ? idx : (() => {
        for (let i = 0; i < NAIVE_MAX; i++) if (!slotOccupied[i]) return i;
        return 0;
      })();

      slotOccupied[slotIdx] = name;

      patchNaive((p) => {
        const slots = [...p.slots];
        slots[slotIdx] = { name, progress: 0, state: "active" };
        const queue = p.queue.filter((q) => q.name !== name);
        return {
          ...p,
          slots,
          queue,
          active: p.active + 1,
          queued: Math.max(0, p.queued - 1),
        };
      });

      const duration = jitter(2800, 800);
      const steps = 40;
      let didFail = false;

      for (let s = 1; s <= steps; s++) {
        await sleepFn(duration / steps);
        if (!runningRef.current) return;

        const pct = Math.round((s / steps) * 100);

        // Inject failure on photo at index 1 around 60%
        if (
          failInjectedRef.current &&
          failTargetRef.current === null &&
          idx === 1 &&
          s === Math.floor(steps * 0.6)
        ) {
          failTargetRef.current = name;
          didFail = true;
          patchNaive((p) => {
            const slots = [...p.slots];
            slots[slotIdx] = { name, progress: pct, state: "error" };
            return { ...p, slots };
          });
          addNaiveLog(`${name} failed at ${pct}% — no release() to call, queue is stuck`, "err");
          await sleepFn(800);
          patchNaive((p) => {
            const slots = [...p.slots];
            slots[slotIdx] = { name: null, progress: 0, state: "idle" };
            return { ...p, slots, active: p.active - 1, failed: p.failed + 1 };
          });
          slotOccupied[slotIdx] = null;
          return;
        }

        patchNaive((p) => {
          const slots = [...p.slots];
          if (slots[slotIdx]?.name === name) {
            slots[slotIdx] = { name, progress: pct, state: "active" };
          }
          return { ...p, slots };
        });
      }

      if (!didFail) {
        patchNaive((p) => {
          const slots = [...p.slots];
          slots[slotIdx] = { name, progress: 100, state: "done" };
          return { ...p, slots };
        });
        await sleepFn(350);
        patchNaive((p) => {
          const slots = [...p.slots];
          slots[slotIdx] = { name: null, progress: 0, state: "idle" };
          return { ...p, slots, active: p.active - 1, done: p.done + 1 };
        });
        slotOccupied[slotIdx] = null;
        addNaiveLog(`${name} done`, "ok");
      }
    });

    await Promise.allSettled(tasks.map((t) => t()));

    setNaiveState((p) => ({
      ...p,
      outcome: failInjectedRef.current
        ? {
            text: "One failure left the queue stalled — the browser had no release() to call. You had zero control over retry order or priority.",
            type: "bad",
          }
        : {
            text: "Done — but up to 6 binary buffers lived in RAM simultaneously. On a mobile device, that risks an OOM tab kill.",
            type: "bad",
          },
    }));
  }

  // ─── Semaphore runner ──────────────────────────────────────────────────────

  async function runSemaphore() {
    let activeUploads = 0;
    const semQueue: Array<(rel: () => void) => void> = [];
    const slotMap: Record<number, string | null> = { 0: null, 1: null, 2: null };

    function createRelease(): () => void {
      let released = false;
      return () => {
        if (released) return;
        released = true;
        activeUploads = Math.max(0, activeUploads - 1);
        if (semQueue.length > 0) {
          const next = semQueue.shift()!;
          activeUploads++;
          next(createRelease());
        }
        patchSem((p) => ({ ...p, active: activeUploads, queued: semQueue.length }));
      };
    }

    function acquire(): Promise<() => void> {
      if (activeUploads < SEM_MAX) {
        activeUploads++;
        patchSem((p) => ({ ...p, active: activeUploads }));
        return Promise.resolve(createRelease());
      }
      return new Promise((resolve) => {
        semQueue.push(resolve);
        patchSem((p) => ({ ...p, queued: semQueue.length }));
      });
    }

    function getFreeSlot(): number {
      for (let i = 0; i < SEM_MAX; i++) if (!slotMap[i]) return i;
      return 0;
    }

    // Seed visible queue with photos 3–7 (first 3 acquire fast path immediately)
    patchSem((p) => ({
      ...p,
      queue: PHOTO_NAMES.slice(SEM_MAX).map((n) => ({ name: n, variant: "owned" as const })),
    }));

    await sleepFn(300);
    addSemLog("All 8 tasks launched — each awaits acquireUploadSlot()", "info");
    await sleepFn(300);
    addSemLog(`First ${SEM_MAX} acquire immediately (fast path). ${TOTAL - SEM_MAX} wait in your queue.`, "ok");

    const tasks = PHOTO_NAMES.map((name, idx) => async () => {
      // Stagger arrival at the semaphore slightly (mimics variable extraction+compression time)
      await sleepFn(jitter(idx * 80, 40));
      if (!runningRef.current) return;

      const releaseFn = await acquire();
      if (!runningRef.current) { releaseFn(); return; }

      // Remove from visible queue
      patchSem((p) => ({
        ...p,
        queue: p.queue.filter((q) => q.name !== name),
        active: activeUploads,
        queued: semQueue.length,
      }));

      const slotIdx = getFreeSlot();
      slotMap[slotIdx] = name;

      patchSem((p) => {
        const slots = [...p.slots];
        slots[slotIdx] = { name, progress: 0, state: "active" };
        return { ...p, slots };
      });

      addSemLog(`${name} → slot ${slotIdx + 1} acquired`, "ok");

      const duration = jitter(2600, 900);
      const steps = 40;
      let didFail = false;

      for (let s = 1; s <= steps; s++) {
        await sleepFn(duration / steps);
        if (!runningRef.current) { releaseFn(); return; }

        const pct = Math.round((s / steps) * 100);

        if (
          failInjectedRef.current &&
          failTargetRef.current === null &&
          idx === 2 &&
          s === Math.floor(steps * 0.55)
        ) {
          failTargetRef.current = name;
          didFail = true;
          patchSem((p) => {
            const slots = [...p.slots];
            slots[slotIdx] = { name, progress: pct, state: "error" };
            return { ...p, slots };
          });
          addSemLog(`${name} failed at ${pct}%`, "err");
          await sleepFn(600);
          addSemLog("finally{} calls releaseSlot() — drainQueue() fires immediately", "warn");
          break;
        }

        patchSem((p) => {
          const slots = [...p.slots];
          if (slots[slotIdx]?.name === name) {
            slots[slotIdx] = { name, progress: pct, state: "active" };
          }
          return { ...p, slots };
        });
      }

      if (!didFail) {
        patchSem((p) => {
          const slots = [...p.slots];
          slots[slotIdx] = { name, progress: 100, state: "done" };
          return { ...p, slots };
        });
        await sleepFn(350);
      }

      slotMap[slotIdx] = null;
      releaseFn(); // This is the finally{} block

      patchSem((p) => {
        const slots = [...p.slots];
        slots[slotIdx] = { name: null, progress: 0, state: "idle" };
        return {
          ...p,
          slots,
          active: activeUploads,
          queued: semQueue.length,
          done: didFail ? p.done : p.done + 1,
          failed: didFail ? p.failed + 1 : p.failed,
        };
      });

      if (!didFail) {
        addSemLog(`${name} done — slot released, next waiter promoted`, "ok");
      } else {
        addSemLog("Slot recovered — remaining uploads unaffected", "ok");
      }
    });

    await Promise.allSettled(tasks.map((t) => t()));

    setSemState((p) => ({
      ...p,
      outcome: failInjectedRef.current
        ? {
            text: `Failure recovered cleanly. finally{} called releaseSlot(), drainQueue() promoted the next waiter instantly. Remaining uploads finished unaffected.`,
            type: "good",
          }
        : {
            text: "Max 3 binary buffers in RAM at once. Browser connection limit never approached. You owned every slot decision.",
            type: "good",
          },
    }));
  }

  // ─── Orchestrate ───────────────────────────────────────────────────────────

  async function run() {
    runningRef.current = true;
    failInjectedRef.current = false;
    failTargetRef.current = null;
    setRunning(true);
    setCanInjectFail(true);
    setNaiveState(initialPanelState(NAIVE_MAX));
    setSemState(initialPanelState(SEM_MAX));
    await Promise.all([runNaive(), runSemaphore()]);
    setRunning(false);
    setCanInjectFail(false);
  }

  function injectFail() {
    if (!failInjectedRef.current) {
      failInjectedRef.current = true;
      setCanInjectFail(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  function Panel({
    title,
    badge,
    badgeVariant,
    slotsLabel,
    queueLabel,
    queueNote,
    state,
    slotCount,
  }: {
    title: string;
    badge: string;
    badgeVariant: "bad" | "good";
    slotsLabel: string;
    queueLabel: string;
    queueNote: string;
    state: PanelState;
    slotCount: number;
  }) {
    return (
      <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden flex flex-col">
        {/* Head */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-800">
          <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 font-sans">
            {title}
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-sans uppercase tracking-wider ${
              badgeVariant === "bad"
                ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {badge}
          </span>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-3 flex-1 bg-white dark:bg-gray-950">
          {/* Slots */}
          <div>
            <div className="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-wider mb-2 font-sans">
              {slotsLabel}
            </div>
            <div className="flex gap-2">
              {state.slots.map((slot, i) => (
                <SlotCard key={i} slot={slot} index={i} />
              ))}
            </div>
          </div>

          {/* Queue */}
          <div>
            <div className="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-wider mb-1 font-sans">
              {queueLabel}{" "}
              <span className="normal-case font-normal text-gray-400 dark:text-gray-600 tracking-normal">
                {queueNote}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 min-h-[28px] items-start">
              {state.queue.length === 0 && (
                <span className="text-[11px] text-gray-300 dark:text-gray-700 font-mono">
                  empty
                </span>
              )}
              {state.queue.map((item) => (
                <QueuePill key={item.name} item={item} />
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-2">
            <StatCard label="active" value={state.active} />
            <StatCard label="waiting" value={state.queued} />
            <StatCard label="done" value={state.done} accent="green" />
            <StatCard label="failed" value={state.failed} accent="red" />
          </div>

          {/* Log */}
          <LogConsole lines={state.logs} />

          {/* Outcome */}
          {state.outcome && (
            <div
              className={`text-xs font-sans rounded-lg px-3 py-2.5 leading-relaxed ${
                state.outcome.type === "good"
                  ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40"
                  : "bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-900/40"
              }`}
            >
              {state.outcome.text}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="my-8 font-sans">
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">

        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 p-5 md:p-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 m-0">
            Naive vs Semaphore
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-0 leading-relaxed">
            Both upload 8 photos. Watch who owns the queue — and what happens when a
            mid-upload failure hits. Click{" "}
            <strong className="text-gray-700 dark:text-gray-300">Inject failure</strong>{" "}
            any time after starting.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={run}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-100 hover:opacity-85 disabled:opacity-40 text-white dark:text-gray-900 text-xs font-semibold rounded-lg shadow-sm transition-opacity"
          >
            <Play size={13} />
            {running ? "Running…" : "Run both"}
          </button>

          <button
            onClick={injectFail}
            disabled={!canInjectFail}
            className="flex items-center gap-2 px-4 py-2 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 disabled:opacity-30 disabled:hover:bg-transparent text-xs font-semibold rounded-lg transition-colors"
          >
            <Zap size={13} />
            Inject failure
          </button>

          <button
            onClick={reset}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-40 text-xs font-medium rounded-lg transition-colors"
          >
            <RotateCcw size={13} />
            Reset
          </button>

          <div className="flex items-center gap-2 ml-auto text-xs text-gray-500 dark:text-gray-400">
            <Cpu size={13} />
            <label htmlFor="sv-speed" className="whitespace-nowrap">
              Speed
            </label>
            <input
              id="sv-speed"
              type="range"
              min={0.5}
              max={3}
              step={0.5}
              value={speedMult}
              onChange={(e) => setSpeedMult(parseFloat(e.target.value))}
              className="w-20"
            />
            <span className="w-6 tabular-nums font-mono">{speedMult}×</span>
          </div>
        </div>

        {/* Panels */}
        <div className="p-5 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Panel
              title="Promise.all(8) — naive"
              badge="no control"
              badgeVariant="bad"
              slotsLabel={`Browser-managed connections (${NAIVE_MAX} hard cap)`}
              queueLabel="Browser's hidden queue"
              queueNote="(you can't see or touch this)"
              state={naiveState}
              slotCount={NAIVE_MAX}
            />
            <Panel
              title="acquireUploadSlot() — yours"
              badge="queue owned"
              badgeVariant="good"
              slotsLabel={`Your upload slots (max ${SEM_MAX}, your code)`}
              queueLabel="Your queue"
              queueNote="(visible, prioritizable, cancellable)"
              state={semState}
              slotCount={SEM_MAX}
            />
          </div>
        </div>
      </div>
    </div>
  );
}