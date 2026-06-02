"use client";

import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ExternalLink,
  Layers,
  Database,
  Cpu,
  RefreshCw,
  Activity,
  Copy,
  ArrowRightLeft,
  HelpCircle,
  Image,
  Link,
  GitBranch,
  Monitor,
  LucideIcon,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConceptResource {
  label: string;
  url: string;
}

interface ConceptDefinition {
  title: string;
  // Optional icon from lucide-react. Omit if nothing fits well.
  icon?: LucideIcon;
  // What it is — one or two plain sentences. No jargon without explanation.
  summary: string;
  // Observable behavior — what you'd see in devtools/profiler/production.
  // Describes consequence, not definition. Not a restatement of summary.
  behavior: string;
  // Optional loose ASCII sketch of the mental model.
  sketch?: string;
  // Any links — MDN, blog posts, talks, whatever you'd actually recommend.
  resources?: ConceptResource[];
}

// ─── Registry ─────────────────────────────────────────────────────────────────

const CONCEPTS: Record<string, ConceptDefinition> = {
  "call-stack": {
    title: "Call Stack",
    icon: Layers,
    summary:
      "The JS engine's to-do list for function calls. It's a stack — last in, first out. When a function is called, a frame is pushed. When it returns, that frame is popped. There is exactly one of these per JS thread.",
    behavior:
      "If a function never returns — or takes 3 seconds to return — nothing else on that thread can run. Not a click handler, not a CSS animation, not a frame paint. This is what \"blocking the main thread\" means in practice. You'll see it in Chrome DevTools as a long red bar in the Performance panel.",
    sketch: `┌──────────────────────────┐
│  heic2any(file)          │  ← currently executing
├──────────────────────────┤
│  processPhoto(file)      │
├──────────────────────────┤
│  handleDrop(event)       │
└──────────────────────────┘
Nothing else runs until
heic2any() returns.`,
    resources: [
      { label: "MDN: Call Stack", url: "https://developer.mozilla.org/en-US/docs/Glossary/Call_Stack" },
      { label: "Jake Archibald: Tasks, microtasks, queues and schedules", url: "https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/" },
    ],
  },

  "heap-memory": {
    title: "Heap Memory",
    icon: Database,
    summary:
      "Where the JS engine stores everything that isn't a primitive. Objects, arrays, closures, and crucially — binary file buffers. Unlike the stack, it has no inherent structure or size limit beyond available RAM.",
    behavior:
      "When you hold a reference to a large File or ArrayBuffer, that binary data lives in the heap. Three concurrent uploads with 8MB files each means ~24MB of heap is pinned until those uploads complete. On mobile, the OS will kill the tab if heap pressure gets too high — with no warning, no error, just a blank page.",
    sketch: `Heap (unstructured pool)
├── File: IMG_0001.heic  →  8.2 MB
├── File: IMG_0002.heic  →  7.9 MB
├── File: IMG_0003.heic  →  8.5 MB
├── Map: progressPoints  →  tiny
└── ... 17 more files   →  ~130 MB total

Mobile tab kill threshold: ~150–300 MB (varies by device)`,
    resources: [
      { label: "MDN: Memory Management", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_Management" },
    ],
  },

  "event-loop": {
    title: "Event Loop",
    icon: Cpu,
    summary:
      "The scheduler that keeps JS alive between tasks. It continuously checks: is the call stack empty? If yes, pull the next task from the queue and run it. This is how setTimeout, network responses, and user events all get their turn.",
    behavior:
      "The event loop is what makes async/await work. When you await fetch(...), your function suspends and the event loop is free to run other tasks — paint a frame, handle a click, run a timer. When the network response arrives, the event loop resumes your function. None of this works if the call stack is occupied by synchronous CPU work.",
    sketch: `┌──────────────────────────────────┐
│  Is the Call Stack empty?        │
└───────────────┬──────────────────┘
                │ yes
                ▼
┌──────────────────────────────────┐
│  Drain all Microtasks (Promises) │
└───────────────┬──────────────────┘
                │ done
                ▼
┌──────────────────────────────────┐
│  Run one Macrotask (I/O, timer)  │
└───────────────┬──────────────────┘
                └──► repeat forever`,
    resources: [
      { label: "MDN: Event Loop", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop" },
      { label: "Jake Archibald: Tasks, microtasks, queues and schedules", url: "https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/" },
      { label: "Philip Roberts: What the heck is the event loop? (JSConf 2014)", url: "https://www.youtube.com/watch?v=8aGhZQkoFbQ" },
    ],
  },

  "macrotasks": {
    title: "Macrotasks",
    icon: RefreshCw,
    summary:
      "The standard task queue. Network responses, setTimeout callbacks, DOM events, and browser frame paints are all macrotasks. The event loop picks one macrotask per cycle, runs it to completion, then checks microtasks before picking the next.",
    behavior:
      "Each browser frame (at 60fps, every ~16ms) is a macrotask. If your macrotask takes 500ms to run, the browser misses ~30 frames — that's the freeze you feel. A completed fetch() also arrives as a macrotask, which is why calling releaseSlot() inside a network handler is a macrotask, and why the next upload starting immediately after is a microtask.",
    resources: [
      { label: "MDN: In depth — Microtasks vs Tasks", url: "https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide/In_depth#tasks_vs_microtasks" },
    ],
  },

  "microtasks": {
    title: "Microtasks",
    icon: Activity,
    summary:
      "A higher-priority queue that runs after every task but before the next frame paint. Promise callbacks — .then(), the code after await — are microtasks. queueMicrotask() lets you schedule one explicitly.",
    behavior:
      "The entire microtask queue drains before the browser is allowed to paint a frame or run the next macrotask. This is what makes Promise chains feel instantaneous. It's also why in our semaphore the next upload starts in the same event loop tick as the previous one finishing: resolve() queues a microtask, and the event loop drains it before moving on.",
    resources: [
      { label: "MDN: Microtask guide", url: "https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide" },
      { label: "Jake Archibald: Tasks, microtasks, queues and schedules", url: "https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/" },
    ],
  },

  "promises": {
    title: "Promises",
    icon: HelpCircle,
    summary:
      "An object representing a value that doesn't exist yet. Three states: pending (waiting), fulfilled (value ready), rejected (failed). A Promise can stay pending indefinitely — until something external calls resolve() on it.",
    behavior:
      "In the semaphore, we exploit this: new Promise(resolve => queue.push(resolve)) creates a Promise that stays pending until a slot frees up. The await on that Promise suspends the uploading function — frozen in place, consuming almost no CPU — until we decide to wake it.",
    sketch: `const p = new Promise(resolve => {
  queue.push(resolve); // nobody calls resolve yet
});

await p; // ← execution suspends here.
         //   function is frozen.
         //   no CPU used. no loop running.
         //   just a pending object on the heap.

// ... somewhere else, when a slot frees up:
resolve(releaseFn); // ← p fulfills. function wakes up.`,
    resources: [
      { label: "MDN: Promise", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise" },
      { label: "You Don't Know JS: Promises", url: "https://github.com/getify/You-Dont-Know-JS/blob/2nd-ed/sync-async/ch3.md" },
    ],
  },

  "structured-cloning": {
    title: "Structured Clone Algorithm",
    icon: Copy,
    summary:
      "The algorithm the browser uses when you pass data across thread boundaries with postMessage. It makes a deep copy — the original stays on the main thread, a full duplicate is created on the worker's heap.",
    behavior:
      "For an 8MB HEIC file, it means 8MB gets allocated twice — once on the main thread, once on the worker — for the duration of the transfer. If you're sending 4 photos at once, that's potentially 64MB of peak heap usage just from cloning overhead. The original gets garbage collected once the worker has the copy, but GC isn't instant.",
    sketch: `Main thread heap          Worker heap
┌────────────────┐        ┌────────────────┐
│ File: 8.2 MB   │──────► │ File: 8.2 MB   │ (copy)
└────────────────┘        └────────────────┘
(original still here      (new allocation)
until GC runs)

Peak: 16.4 MB held simultaneously`,
    resources: [
      { label: "MDN: Structured clone algorithm", url: "https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm" },
    ],
  },

  "transferables": {
    title: "Transferable Objects",
    icon: ArrowRightLeft,
    summary:
      "An opt-in zero-copy alternative to structured cloning. Instead of duplicating the data, the browser moves ownership of the memory from one thread to the other. No copy is made. The transfer is instantaneous regardless of data size.",
    behavior:
      "The tradeoff: the sending thread loses access immediately. After postMessage(buffer, [buffer]), trying to read buffer.byteLength on the main thread returns 0 — the memory is gone from its perspective. For our pipeline this is fine: once we hand a file to a worker, the main thread has no reason to read it again.",
    sketch: `Main thread heap          Worker heap
┌────────────────┐        ┌────────────────┐
│ ArrayBuffer    │──────► │ ArrayBuffer    │
│ (now detached) │        │ (same memory,  │
│ byteLength: 0  │        │  new owner)    │
└────────────────┘        └────────────────┘

No copy. No GC pressure. Instant.`,
    resources: [
      { label: "MDN: Transferable objects", url: "https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects" },
    ],
  },

  "render-thrashing": {
    title: "Render Thrashing",
    icon: Monitor,
    summary:
      "What happens when you call setState far faster than React can process. Each call schedules a reconciliation — React diffs the virtual DOM, generates a new tree, schedules a paint. When those calls arrive hundreds of times per second, you're queuing more work than can ever be processed in a frame.",
    behavior:
      "In the Performance panel, render thrashing looks like a wall of yellow (scripting) and purple (rendering) tasks with almost no green (painting). Frame rate drops to near zero even though the page looks like it should be animating. The fix: collect high-frequency events in a mutable ref (invisible to React), and let a throttled interval call setState with the accumulated value.",
    sketch: `Without throttling:
event → setState → reconcile → setState → reconcile → ...
[300 reconciliations/sec. Frames drop. Animations stutter.]

With ref buffering:
event → ref.current.set(id, pts)  ← silent, costs nothing
event → ref.current.set(id, pts)  ← silent, costs nothing
setInterval (4×/sec) → setState(calculateBatch(ref.current))
[4 reconciliations/sec. Frames stay at 60fps.]`,
    resources: [
      { label: "React docs: Render and Commit", url: "https://react.dev/learn/render-and-commit" },
      { label: "MDN: requestAnimationFrame", url: "https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame" },
    ],
  },

  "offscreen-canvas": {
    title: "OffscreenCanvas",
    icon: Image,
    summary:
      "A canvas element with no DOM attachment. Because it has no DOM presence, it can be transferred to a Web Worker and used for pixel manipulation — resize, encode, draw — entirely off the main thread.",
    behavior:
      "In our compression worker, OffscreenCanvas is how we resize photos to 1920×1920 without touching the main thread. A regular canvas element can't be used in a worker at all — it requires DOM access. OffscreenCanvas was specifically added to close this gap. Browser support is now solid across Chrome, Firefox, and Safari.",
    resources: [
      { label: "MDN: OffscreenCanvas", url: "https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas" },
    ],
  },

  "blurhash": {
    title: "Blurhash",
    icon: Image,
    summary:
      "A compact string encoding of an image's blurred color palette — typically 20–30 characters. Generated once from the image pixels during upload, stored in the database, decoded on the viewer side into a blurry placeholder before the real image loads.",
    behavior:
      "A blurhash like LKO2?U%2Tw=w]~RBVZRi};RPxuwH encodes enough color information to render a recognizable blurred preview at any size in under 1ms. This is why trip pages show an instant colored blur before a single byte of the JPEG has arrived from R2. The perceptual gap between blank and something is what makes a page feel fast on slow connections.",
    resources: [
      { label: "woltapp/blurhash on GitHub", url: "https://github.com/woltapp/blurhash" },
    ],
  },

  "object-url": {
    title: "Object URL",
    icon: Link,
    summary:
      "A temporary browser-local URL like blob:https://yoursite.com/abc-123 that points directly to binary data in memory. Created with URL.createObjectURL(file). The browser serves that data locally when anything requests the URL.",
    behavior:
      "This is how we show a photo preview the instant the extraction worker returns, before the image has been uploaded anywhere — the img src loads from RAM, not the network. Critical detail: Object URLs are not garbage collected automatically. Every createObjectURL call must be paired with a revokeObjectURL call or you leak memory for the lifetime of the page. In usePolaroidAnimationSequence, cleanup happens in resetAnimationSequence.",
    resources: [
      { label: "MDN: URL.createObjectURL()", url: "https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static" },
    ],
  },

  "deferred-promise": {
    title: "Deferred Promise",
    icon: GitBranch,
    summary:
      "A pattern where you create a Promise but hold onto its resolve function separately, so you can fulfill it from outside the constructor — triggered by an external event rather than the Promise's own async work.",
    behavior:
      "Normally a Promise resolves itself. With the deferred pattern, resolve is stored and called later by a different part of the code. This is exactly how our semaphore works — and how useTripMediaUpload holds the session open after all uploads finish, waiting for the user to click Next: new Promise(resolve => { userProceedActionResolver.current = resolve; }).",
    sketch: `// Standard Promise — resolves itself
new Promise(resolve => setTimeout(resolve, 1000));

// Deferred — resolved by external caller
let wakeUp;
const gate = new Promise(resolve => { wakeUp = resolve; });

await gate; // sleeps here until...

// ...somewhere else entirely:
wakeUp();   // gate fulfills, execution resumes`,
    resources: [
      { label: "MDN: Promise constructor", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/Promise" },
    ],
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface ConceptTipProps {
  id: string;
  children?: React.ReactNode;
}

export default function ConceptTip({ id, children }: ConceptTipProps) {
  const def = CONCEPTS[id];

  if (!def) {
    return (
      <span className="text-red-500 font-mono text-sm">
        [concept &quot;{id}&quot; not found]
      </span>
    );
  }

  const Icon = def.icon;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-indigo-300/60 dark:border-indigo-700/60 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[13px] font-mono cursor-help transition-colors hover:border-indigo-400 hover:bg-indigo-100/60 dark:hover:bg-indigo-950/60">
          {Icon && <Icon className="w-3 h-3 shrink-0 opacity-70" />}
          <span className="border-b border-dotted border-indigo-400/60 leading-none">
            {children ?? def.title}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[360px] p-0 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-xl rounded-xl overflow-hidden z-[200]"
      >
        {/* Header — fixed, never scrolls */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
          {Icon && (
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900">
              <Icon className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            </div>
          )}
          <h4 className="text-sm font-bold font-mono text-gray-900 dark:text-gray-100 leading-none">
            {def.title}
          </h4>
        </div>

        {/* Scrollable body */}
        <div className="max-h-[min(420px,60vh)] overflow-y-auto overscroll-contain">
          <div className="px-4 py-3 space-y-4">

            {/* Summary */}
            <p className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed">
              {def.summary}
            </p>

            {/* In practice */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
                In practice
              </p>
              <p className="text-[12px] text-gray-600 dark:text-gray-400 leading-relaxed">
                {def.behavior}
              </p>
            </div>

            {/* Sketch */}
            {def.sketch && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
                  Mental model
                </p>
                <pre className="text-[11px] font-mono bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 p-3 rounded-lg border border-gray-100 dark:border-gray-800 overflow-x-auto leading-relaxed whitespace-pre">
                  {def.sketch}
                </pre>
              </div>
            )}

            {/* Resources */}
            {def.resources && def.resources.length > 0 && (
              <div className="pt-1 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-1.5 pb-1">
                {def.resources.map((r) => (
                  <a
                    key={r.url}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-mono transition-colors"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    {r.label}
                  </a>
                ))}
              </div>
            )}

          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}