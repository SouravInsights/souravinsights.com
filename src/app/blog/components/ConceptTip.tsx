"use client";

import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Layers, 
  Database, 
  Cpu, 
  RefreshCw, 
  Copy, 
  ArrowRightLeft, 
  Activity, 
  HelpCircle, 
  ExternalLink 
} from "lucide-react";

interface ConceptDefinition {
  title: string;
  category: "execution" | "memory" | "threading" | "react";
  icon: React.ComponentType<{ className?: string }>;
  analogy: string;
  engine: string;
  diagram?: string;
  link: string;
}

const CONCEPT_REGISTRY: Record<string, ConceptDefinition> = {
  "call-stack": {
    title: "Call Stack",
    category: "execution",
    icon: Layers,
    analogy: "Think of it as a kitchen order ticket rail. The chef can only cook one recipe (function) at a time, stacking new tickets on top and clearing them from top to bottom (LIFO).",
    engine: "A single-threaded LIFO (Last In, First Out) stack that tracks function execution frames in V8. Running heavy code synchronous blocks the stack, freezing the entire thread.",
    diagram: `┌─────────────────────────┐
│ Function execution frame│ ◄── Active Cook
├─────────────────────────┤
│ Outer function scope    │
├─────────────────────────┤
│ Global execution context│
└─────────────────────────┘`,
    link: "https://developer.mozilla.org/en-US/docs/Glossary/Call_Stack",
  },
  "heap-memory": {
    title: "Heap Memory",
    category: "memory",
    icon: Database,
    analogy: "The kitchen pantry and counter space. A large, unstructured area where big ingredient sacks (raw binary files, canvas pixel arrays, closures) are stored.",
    engine: "An unstructured, large memory pool in the V8 engine where objects, closures, array buffers, and dynamic reference types are allocated.",
    diagram: `[ V8 Heap Storage Pool ]
├── Blob: 8.2MB Apple HEIC Buffer
├── Object: Progress Map pointer
└── Array: Promise resolution queue`,
    link: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_Management",
  },
  "event-loop": {
    title: "Event Loop",
    category: "execution",
    icon: Cpu,
    analogy: "A single waiter circulating between tables, kitchen, and the door. The waiter coordinates customer clicks, ready dishes, and lets the host paint new UI states.",
    engine: "A continuous loop in the browser context that checks if the Call Stack is empty, drains task queues, and handles page rendering layout and paint phases.",
    diagram: `Call Stack Empty? ── YES ──► Check Microtasks (Promises)
      ▲                                   │ (drains completely)
      │                                   ▼
Render Paint (Macrotask) ◄── NO ── Drained? ── YES ──► Render`,
    link: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop",
  },
  "macrotasks": {
    title: "Macrotask Queue",
    category: "execution",
    icon: RefreshCw,
    analogy: "Regular restaurant table services. Seating a party, taking orders, washing dishes. The waiter completes exactly ONE full service, then reviews the room.",
    engine: "A task queue holding macro-level events like network connection completions, mouse clicks, key presses, timeouts (setTimeout), and paint routines.",
    diagram: `[ Macrotask Queue ]
├── [Click Event]
├── [setTimeout Callback]
└── [Network Fetch Success] ◄── Pops 1 per loop tick`,
    link: "https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide/In_depth#tasks_vs_microtasks",
  },
  "microtasks": {
    title: "Microtask Queue",
    category: "execution",
    icon: Activity,
    analogy: "Immediate kitchen safety overrides. Shutting off an overflowing faucet or refilling salt. The waiter must resolve ALL of these before taking another table order.",
    engine: "A high-priority queue holding Promise callbacks (.then / await). The engine drains the ENTIRE microtask queue before yielding to rendering or the next macrotask.",
    diagram: `[ Microtask Queue ]
├── [Promise resolve #1]
├── [Promise resolve #2]
└── [Promise resolve #3] ◄── Engine runs ALL before painting`,
    link: "https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide",
  },
  "structured-cloning": {
    title: "Structured Clone Algorithm",
    category: "threading",
    icon: Copy,
    analogy: "Making an exact photocopy of a 500-page recipe book and courier shipping it to a worker branch, rather than sharing the book. It takes duplication effort.",
    engine: "A serializing copy algorithm used to send data across Web Worker threads. Deep-copies V8 Heap allocations, temporarily doubling memory usage during transport.",
    diagram: `[ Main Thread Heap ]  ── postMessage(file) ──►  [ Worker Heap ]
   (original file)                                 (duplicated clone)
  *Memory doubles momentarily during cloning*`,
    link: "https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm",
  },
  "transferables": {
    title: "Transferable Objects",
    category: "threading",
    icon: ArrowRightLeft,
    analogy: "Handing over the physical keys to the car. You no longer own it, but no photocopy copy was needed. It is a zero-copy, instantaneous transfer of deeds.",
    engine: "A zero-copy memory transfer mechanic for ArrayBuffers, MessagePorts, or OffscreenCanvases. It detaches the memory pointer from main thread heap instantly.",
    diagram: `[ Main Thread Heap ]  ── (Pointer transfer) ──►  [ Worker Heap ]
     [ArrayBuffer]   ─── (Ownership moves) ───►   [ArrayBuffer]
  *Main thread instantly loses all reference access*`,
    link: "https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects",
  },
  "render-thrashing": {
    title: "Render Thrashing",
    category: "react",
    icon: Cpu,
    analogy: "A building client screaming minor detail updates fifty times a second, forcing the architect to erase and redraw the blueprints over and over.",
    engine: "CPU bottlenecking caused by queueing high-frequency state updates in React. Forces constant Virtual DOM diffs and triggers aggressive garbage collection.",
    diagram: `[ 300 Network Events/sec ] ──► React Scheduler ──► Render Diffing
                                                      ▲
    *Call Stack locked up, frames drop to zero* ──────┘`,
    link: "https://react.dev/learn/render-and-commit",
  },
  "promises": {
    title: "Promises",
    category: "execution",
    icon: HelpCircle,
    analogy: "A pager given to you at a restaurant. It stays silent and dark (pending) in your hand, suspending your entry, until the host resolves the buzzer.",
    engine: "Heap-allocated objects with a state field tracking pending/fulfilled/rejected status. Storing its resolve function manually defers the callback task.",
    diagram: `[[PromiseState]]: "pending" ── (resolve called) ──► [[PromiseState]]: "fulfilled"
          │                                                    │
    (Sits in Heap)                                     (Microtask queued)`,
    link: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise",
  }
};

interface ConceptTipProps {
  id: string;
  children?: React.ReactNode;
}

export default function ConceptTip({ id, children }: ConceptTipProps) {
  const definition = CONCEPT_REGISTRY[id];

  if (!definition) {
    return <span className="text-red-500 font-mono">[{id} not found]</span>;
  }

  const Icon = definition.icon;

  const categoryColors = {
    execution: "border-indigo-500/30 text-indigo-400 bg-indigo-500/10 hover:border-indigo-400 hover:text-indigo-300",
    memory: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:border-emerald-400 hover:text-emerald-300",
    threading: "border-sky-500/30 text-sky-400 bg-sky-500/10 hover:border-sky-400 hover:text-sky-300",
    react: "border-purple-500/30 text-purple-400 bg-purple-500/10 hover:border-purple-400 hover:text-purple-300",
  };

  const badgeColors = {
    execution: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    memory: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    threading: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    react: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[13px] font-mono cursor-help select-none transition-all duration-200 ${categoryColors[definition.category]}`}
        >
          <Icon className="w-3.5 h-3.5 mr-1" />
          <span className="border-b border-dotted border-current leading-none">{children || definition.title}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-80 p-4 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950/95 backdrop-blur shadow-xl rounded-xl z-[100]"
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/80 pb-2">
            <div className="flex items-center space-x-2">
              <Icon className={`w-4 h-4 ${definition.category === 'execution' ? 'text-indigo-400' : definition.category === 'memory' ? 'text-emerald-400' : definition.category === 'threading' ? 'text-sky-400' : 'text-purple-400'}`} />
              <h4 className="text-sm font-bold font-mono text-gray-900 dark:text-gray-100">
                {definition.title}
              </h4>
            </div>
            <span className={`text-[10px] font-mono font-medium uppercase tracking-wider px-2 py-0.5 rounded border ${badgeColors[definition.category]}`}>
              {definition.category}
            </span>
          </div>

          {/* Analogy Section */}
          <div className="space-y-1">
            <h5 className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 font-sans tracking-wide">
              The Analogy
            </h5>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-sans italic">
              “{definition.analogy}”
            </p>
          </div>

          {/* Engine Mechanics Section */}
          <div className="space-y-1">
            <h5 className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 font-sans tracking-wide">
              Engine Mechanics
            </h5>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-sans">
              {definition.engine}
            </p>
          </div>

          {/* Diagram Section */}
          {definition.diagram && (
            <div className="space-y-1">
              <h5 className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 font-sans tracking-wide">
                Mental Map
              </h5>
              <pre className="text-[10px] font-mono bg-gray-50 dark:bg-gray-900/80 text-gray-500 dark:text-gray-400 p-2 rounded-lg border border-gray-150 dark:border-gray-800/60 overflow-x-auto leading-normal">
                {definition.diagram}
              </pre>
            </div>
          )}

          {/* Learn More link */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-end">
            <a
              href={definition.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-[10px] text-indigo-400 hover:text-indigo-300 font-mono transition-colors"
            >
              <span>Read Spec</span>
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
