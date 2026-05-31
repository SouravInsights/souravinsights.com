"use client";

import React, { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Smartphone, Cpu, Server, Database, Cloud, Globe, Play, RotateCcw, ArrowRight, ImagePlus, FastForward, PlayCircle, PauseCircle, Lock } from "lucide-react";

gsap.registerPlugin(useGSAP);

const PHASES = [
  {
    title: "Start",
    description: "Click 'Next Phase' to step through the sequence diagram.",
    steps: []
  },
  {
    title: "Phase 1: Worker Extraction (EXIF & heic2any)",
    description: "The user drops 4 Apple HEIC photos from their iPhone. They are sent to extract.worker.ts to safely parse EXIF data and convert them to browser-renderable JPEGs.",
    steps: [
      "Drop 4 HEIC photos into Media Library",
      "Main Thread intercepts the files",
      "Pass File objects to extract.worker.ts",
      "Convert HEIC -> JPEG (heic2any)",
      "Extract EXIF & Dimensions",
      "Return renderable JPEGs for UI preview"
    ]
  },
  {
    title: "Phase 2: Worker Compression (@jsquash/jpeg)",
    description: "The Main Thread sends the renderable JPEGs to compress.worker.ts for heavy JPEG compression and Blurhash generation.",
    steps: [
      "Offload to compress.worker.ts",
      "Lazy load @jsquash/jpeg WASM",
      "Compress to JPEG",
      "Generate Base64 Blurhash string",
      "Return optimized assets to Main Thread"
    ]
  },
  {
    title: "Phase 3: Network Upload Pipeline (Semaphore)",
    description: "The complete network trip. A Semaphore limits concurrency to 3 to prevent Safari OOM memory crashes and respect browser connection limits.",
    steps: [
      "Acquire Semaphore Slots (Max 3)",
      "POST /request-upload (Verify Quota)",
      "Upload raw JPEG bytes directly to R2",
      "POST /complete (Sync Ledger in DB)",
      "Semaphore releases, Queue advances"
    ]
  },
  {
    title: "Phase 4: Edge Delivery",
    description: "When someone visits the public trip page, they receive a buttery-smooth progressive loading experience.",
    steps: [
      "Viewer requests Public Trip Page",
      "Decode DB Blurhash to instant UI placeholder",
      "Stream high-res JPEG directly from R2",
      "Swap placeholder for crisp image"
    ]
  }
];

export default function ArchitectureFlowVisualizer() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Node Refs
  const userRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<HTMLDivElement>(null);
  const uiRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<HTMLDivElement>(null);
  const dbRef = useRef<HTMLDivElement>(null);
  const r2Ref = useRef<HTMLDivElement>(null);

  // Asset Refs
  const apiPillRef = useRef<HTMLDivElement>(null);
  const photoARef = useRef<HTMLDivElement>(null);
  const photoBRef = useRef<HTMLDivElement>(null);
  const photoCRef = useRef<HTMLDivElement>(null);
  const photoDRef = useRef<HTMLDivElement>(null);
  
  const allPhotos = [photoARef, photoBRef, photoCRef, photoDRef];

  const [currentPhase, setCurrentPhase] = useState(0);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [semaphoreState, setSemaphoreState] = useState<{ active: string[], queue: string[] } | null>(null);
  
  // Speed and Auto controls
  const [speed, setSpeed] = useState<1 | 0.5 | 0.25>(1);
  const [isAuto, setIsAuto] = useState(false);
  const isAutoRef = useRef(isAuto);
  const speedRef = useRef(speed);
  
  React.useEffect(() => {
    isAutoRef.current = isAuto;
  }, [isAuto]);
  
  React.useEffect(() => {
    speedRef.current = speed;
    if (timelineRef.current) timelineRef.current.timeScale(speed);
  }, [speed]);

  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  // Calculate coordinates with spread for multiple items
  const getCoords = (stationRef: React.RefObject<HTMLDivElement>, offsetIndex = 0, total = 1, isPhoto = true) => {
    if (!stationRef.current || !containerRef.current) return { x: 0, y: 0 };
    const containerRect = containerRef.current.getBoundingClientRect();
    const stationRect = stationRef.current.getBoundingClientRect();
    
    // Base center
    let x = stationRect.left - containerRect.left + (stationRect.width / 2);
    let y = stationRect.top - containerRect.top + (stationRect.height / 2);

    // Float photos above the text label so they don't cover it
    if (isPhoto) {
      y -= 25;
    }

    if (total > 1) {
      const spread = 60; // 60px total spread
      const step = spread / (total - 1 || 1);
      const startX = x - (spread / 2);
      x = startX + (step * offsetIndex);
      
      // Arc slightly
      const normalizedIndex = offsetIndex - (total - 1) / 2; // -1.5, -0.5, 0.5, 1.5
      y += Math.abs(normalizedIndex) * 10 - 15;
    }

    return { x, y };
  };

  const moveApiPill = (tl: gsap.core.Timeline, from: React.RefObject<HTMLDivElement>, to: React.RefObject<HTMLDivElement>, label: string, position?: string | number) => {
    const fromCoords = getCoords(from, 0, 1, false);
    const toCoords = getCoords(to, 0, 1, false);

    tl.set(apiPillRef.current, { x: fromCoords.x, y: fromCoords.y, opacity: 0 }, position);
    
    tl.to(apiPillRef.current, { 
      opacity: 1, 
      duration: 0.1,
      onStart: () => {
        if (apiPillRef.current) apiPillRef.current.innerHTML = label;
      }
    }, position);

    tl.to(apiPillRef.current, {
      x: toCoords.x,
      y: toCoords.y,
      duration: 0.5,
      ease: "power2.inOut"
    }, position ? `${position}+=0.1` : "+=0");

    tl.to(apiPillRef.current, { opacity: 0, duration: 0.1 }, "+=0.1");
  };

  const playPhase = (phaseIndex: number) => {
    if (isPlaying) return;
    setIsPlaying(true);
    setCurrentPhase(phaseIndex);
    setCurrentStep(-1);
    setSemaphoreState(null);

    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    const tl = gsap.timeline({
      onComplete: () => {
        setIsPlaying(false);
        if (isAutoRef.current && phaseIndex < PHASES.length - 1) {
          setTimeout(() => {
            if (isAutoRef.current) playPhase(phaseIndex + 1);
          }, 800 / speedRef.current);
        } else if (isAutoRef.current) {
          setIsAuto(false);
        }
      }
    });
    tl.timeScale(speedRef.current);
    timelineRef.current = tl;

    // Reset Pill
    gsap.set(apiPillRef.current, { opacity: 0 });

    const A = photoARef.current;
    const B = photoBRef.current;
    const C = photoCRef.current;
    const D = photoDRef.current;

    if (phaseIndex === 1) {
      // Step 0: Drop photos into Media Library UI
      tl.call(() => setCurrentStep(0));
      allPhotos.forEach((p, i) => {
        const coords = getCoords(userRef, i, 4);
        gsap.set(p.current, { x: coords.x, y: coords.y, opacity: 0, scale: 0.5, backgroundColor: "white", color: "#111827", filter: "blur(0px)" });
      });
      tl.to([A, B, C, D], { opacity: 1, scale: 1, duration: 0.4, stagger: 0.1, ease: "back.out(1.7)" });
      
      // Step 1: Main Thread receives DOM Drop Event
      tl.call(() => setCurrentStep(1), undefined, "+=0.2");
      tl.to([A, B, C, D], {
        duration: 0.4,
        x: (i) => getCoords(mainRef, i, 4).x,
        y: (i) => getCoords(mainRef, i, 4).y,
        stagger: 0.1,
        ease: "power2.inOut"
      });

      // Step 2: Pass File objects to Worker
      tl.call(() => setCurrentStep(2), undefined, "+=0.1");
      tl.to([A, B, C, D], {
        duration: 0.4,
        x: (i) => getCoords(workerRef, i, 4).x,
        y: (i) => getCoords(workerRef, i, 4).y,
        stagger: 0.1,
        ease: "power2.inOut"
      });

      // Step 3: Convert HEIC -> JPEG (heic2any)
      tl.call(() => setCurrentStep(3), undefined, "+=0.1");
      tl.to([A, B, C, D], { backgroundColor: "#fef08a", color: "#854d0e", duration: 0.3, stagger: 0.1 });
      tl.to([A, B, C, D], { rotation: 10, yoyo: true, repeat: 1, duration: 0.15, stagger: 0.05 }, "+=0.1");

      // Step 4: Extract EXIF & Dimensions
      tl.call(() => setCurrentStep(4));
      tl.to([A, B, C, D], { scale: 1.1, yoyo: true, repeat: 1, duration: 0.2, stagger: 0.1 }, "+=0.1");

      // Step 5: Return renderable JPEGs for UI preview
      tl.call(() => setCurrentStep(5));
      tl.to([A, B, C, D], {
        duration: 0.6,
        x: (i) => getCoords(mainRef, i, 4).x,
        y: (i) => getCoords(mainRef, i, 4).y,
        stagger: 0.1,
        ease: "power2.inOut"
      }, "+=0.2");
    } 
    else if (phaseIndex === 2) {
      // Step 0: Offload to Worker 2
      tl.call(() => setCurrentStep(0));
      tl.to([A, B, C, D], {
        duration: 0.5,
        x: (i) => getCoords(workerRef, i, 4).x,
        y: (i) => getCoords(workerRef, i, 4).y,
        stagger: 0.1,
        ease: "power2.inOut"
      });

      // Step 1: Lazy load WASM
      tl.call(() => setCurrentStep(1), undefined, "+=0.1");
      tl.to([A, B, C, D], { scale: 1.1, duration: 0.15, yoyo: true, repeat: 1, stagger: 0.05 });

      // Step 2: Compress JPEG -> WebP
      tl.call(() => setCurrentStep(2), undefined, "+=0.1");
      tl.to([A, B, C, D], { backgroundColor: "#f97316", color: "white", duration: 0.2, stagger: 0.1 });
      tl.to([A, B, C, D], { rotation: 15, yoyo: true, repeat: 3, duration: 0.1, stagger: 0.1 }, "+=0.1");

      // Step 3: Generate Blurhash
      tl.call(() => setCurrentStep(3));
      tl.to([A, B, C, D], { scale: 0.8, duration: 0.2, stagger: 0.1 }, "+=0.1");

      // Step 4: Return to Main Thread
      tl.call(() => setCurrentStep(4));
      tl.to([A, B, C, D], {
        duration: 0.5,
        x: (i) => getCoords(mainRef, i, 4).x,
        y: (i) => getCoords(mainRef, i, 4).y,
        stagger: 0.1,
        ease: "power2.inOut"
      }, "+=0.2");
      
      // Reset scale for next phase
      tl.to([A, B, C, D], { scale: 1, duration: 0.2 }, "+=0.1");
    }
    else if (phaseIndex === 3) {
      // Step 0: Acquire Semaphore Slots
      tl.call(() => setCurrentStep(0));
      tl.call(() => setSemaphoreState({ active: ["A", "B", "C"], queue: ["D"] }));
      
      // Visual indication of queue blocking on D
      tl.to(D, { scale: 0.8, opacity: 0.5 }, "+=0.2");
      
      // Step 1: Quota Check for A, B, C (Main -> API -> DB -> Main)
      tl.call(() => setCurrentStep(1));
      moveApiPill(tl, mainRef, apiRef, "3x POST /request-upload");
      moveApiPill(tl, apiRef, dbRef, "3x Check Quota");
      moveApiPill(tl, dbRef, apiRef, "3x Quota OK");
      moveApiPill(tl, apiRef, mainRef, "3x Signed URLs");

      // Step 2: Direct Upload to R2 for active slots
      tl.call(() => setCurrentStep(2));
      tl.to([A, B, C], {
        duration: 0.8,
        x: (i) => getCoords(r2Ref, i, 3).x,
        y: (i) => getCoords(r2Ref, i, 3).y,
        stagger: 0.1,
        ease: "back.out(1.2)"
      });

      tl.to([A, B, C], { rotation: -10, yoyo: true, repeat: 3, duration: 0.2, stagger: 0.1 }, "+=0.1");

      // Step 3: Sync Ledger for A, B, C
      tl.call(() => setCurrentStep(3));
      moveApiPill(tl, mainRef, apiRef, "3x POST /complete");
      moveApiPill(tl, apiRef, dbRef, "3x Sync Ledger");

      // A, B, C finish!
      tl.to([A, B, C], { backgroundColor: "#3b82f6", color: "white", duration: 0.3, stagger: 0.1 }, "+=0.1");

      // Step 4: Queue advances!
      tl.call(() => setCurrentStep(4));
      tl.call(() => setSemaphoreState({ active: ["D", "B", "C"], queue: [] }));
      
      // D restores full opacity (acquires slot)
      tl.to(D, { opacity: 1, scale: 1, duration: 0.3 }, "+=0.1");

      // Loop Step 1 for D: Quota Check!
      tl.call(() => setCurrentStep(1), undefined, "+=0.2");
      moveApiPill(tl, mainRef, apiRef, "1x POST /request-upload");
      moveApiPill(tl, apiRef, mainRef, "1x Signed URL");

      // Loop Step 2 for D: Direct Upload!
      tl.call(() => setCurrentStep(2));
      tl.to(D, {
        duration: 0.6,
        x: getCoords(r2Ref, 0, 3).x,
        y: getCoords(r2Ref, 0, 3).y,
        ease: "power2.out"
      }, "+=0.1");
      
      tl.to(D, { rotation: -10, yoyo: true, repeat: 3, duration: 0.2 }, "+=0.1");
      
      // Loop Step 3 for D: Sync Ledger!
      tl.call(() => setCurrentStep(3));
      moveApiPill(tl, mainRef, apiRef, "1x POST /complete");
      moveApiPill(tl, apiRef, dbRef, "1x Sync Ledger");

      // D finishes!
      tl.to(D, { backgroundColor: "#3b82f6", color: "white", duration: 0.3 }, "+=0.1");
      
      // Clean up tracker at end
      tl.call(() => setSemaphoreState(null), undefined, "+=0.5");
    }
    else if (phaseIndex === 4) {
      // Step 0: Viewer requests Public Trip Page
      tl.call(() => setCurrentStep(0));
      tl.to([A, B, C, D], {
        duration: 0.8,
        x: (i) => getCoords(uiRef, i, 4).x,
        y: (i) => getCoords(uiRef, i, 4).y,
        stagger: 0.15,
        ease: "power2.inOut"
      });

      // Step 1: Decode DB Blurhash
      tl.call(() => setCurrentStep(1));
      tl.to([A, B, C, D], { backgroundColor: "#a855f7", filter: "blur(4px)", duration: 0.3, stagger: 0.1 }, "+=0.1");

      // Step 2: Stream high-res WebP
      tl.call(() => setCurrentStep(2));
      tl.to([A, B, C, D], { scale: 1.2, duration: 0.2, yoyo: true, repeat: 1, stagger: 0.1 }, "+=0.1");

      // Step 3: Swap for crisp image
      tl.call(() => setCurrentStep(3));
      tl.to([A, B, C, D], { 
        filter: "blur(0px)", 
        backgroundColor: "#22c55e", 
        duration: 0.4,
        stagger: 0.1 
      }, "+=0.2");
    }
  };

  const nextPhase = () => {
    if (currentPhase < PHASES.length - 1) {
      playPhase(currentPhase + 1);
    }
  };

  const reset = () => {
    if (timelineRef.current) timelineRef.current.kill();
    gsap.set(apiPillRef.current, { opacity: 0 });
    
    allPhotos.forEach(p => {
      gsap.set(p.current, { opacity: 0, x: 0, y: 0, scale: 0.5, filter: "blur(0px)", backgroundColor: "white", color: "#111827", rotation: 0 });
    });

    setCurrentPhase(0);
    setCurrentStep(-1);
    setSemaphoreState(null);
    setIsPlaying(false);
    setIsAuto(false);
  };

  const toggleAuto = () => {
    const nextAuto = !isAuto;
    setIsAuto(nextAuto);
    if (nextAuto && !isPlaying && currentPhase < PHASES.length - 1) {
      playPhase(currentPhase === 0 ? 1 : currentPhase + 1);
    }
  };

  // SVG Refs
  const lineUserMain = useRef<SVGLineElement>(null);
  const lineWorkerMain = useRef<SVGLineElement>(null);
  const lineMainUi = useRef<SVGLineElement>(null);
  const lineMainApi = useRef<SVGLineElement>(null);
  const lineApiDb = useRef<SVGLineElement>(null);
  const lineApiR2 = useRef<SVGLineElement>(null);
  const pathMainR2 = useRef<SVGPathElement>(null);
  const pathR2Ui = useRef<SVGPathElement>(null);

  useGSAP(() => {
    gsap.set(apiPillRef.current, { xPercent: -50, yPercent: -50, opacity: 0 });
    allPhotos.forEach(p => gsap.set(p.current, { xPercent: -50, yPercent: -50, opacity: 0 }));

    const updatePaths = () => {
      const cUser = getCoords(userRef, 0, 1, false);
      const cWorker = getCoords(workerRef, 0, 1, false);
      const cMain = getCoords(mainRef, 0, 1, false);
      const cUi = getCoords(uiRef, 0, 1, false);
      const cApi = getCoords(apiRef, 0, 1, false);
      const cDb = getCoords(dbRef, 0, 1, false);
      const cR2 = getCoords(r2Ref, 0, 1, false);

      const setLine = (ref: React.RefObject<SVGLineElement>, p1: {x: number, y: number}, p2: {x: number, y: number}) => {
        if (ref.current) {
          ref.current.setAttribute("x1", p1.x.toString());
          ref.current.setAttribute("y1", p1.y.toString());
          ref.current.setAttribute("x2", p2.x.toString());
          ref.current.setAttribute("y2", p2.y.toString());
        }
      };

      setLine(lineUserMain, cUser, cMain);
      setLine(lineWorkerMain, cWorker, cMain);
      setLine(lineMainUi, cMain, cUi);
      setLine(lineMainApi, cMain, cApi);
      setLine(lineApiDb, cApi, cDb);
      setLine(lineApiR2, cApi, cR2);

      if (pathMainR2.current) {
         pathMainR2.current.setAttribute("d", `M ${cMain.x} ${cMain.y} Q ${cApi.x} ${Math.min(cMain.y, cR2.y) - 100} ${cR2.x} ${cR2.y}`);
      }
      if (pathR2Ui.current) {
         pathR2Ui.current.setAttribute("d", `M ${cR2.x} ${cR2.y} Q ${cApi.x} ${Math.max(cR2.y, cUi.y) + 150} ${cUi.x} ${cUi.y}`);
      }
    };

    setTimeout(updatePaths, 100);
    
    // Use ResizeObserver instead of window resize so it catches DOM layout shifts (like a sidebar collapsing)
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updatePaths);
    });
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, { scope: containerRef });

  return (
    <div className="my-12 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden shadow-2xl flex flex-col md:flex-row font-sans">
      
      {/* LEFT: Architecture Diagram */}
      <div ref={containerRef} className="relative w-full md:w-2/3 p-8 bg-gray-50 dark:bg-gray-900/50 border-r border-gray-200 dark:border-gray-800 min-h-[450px] flex items-center justify-center">
        
        {/* Dynamic Payload Pill */}
        <div 
          ref={apiPillRef} 
          className="absolute top-0 left-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg z-50 whitespace-nowrap pointer-events-none"
        >
          Payload
        </div>

        {/* Minimalist Live Semaphore Tracker (Floating at Top) */}
        <div className={`absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-4 transition-all duration-500 pointer-events-none z-50 ${semaphoreState ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
          <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 bg-white/50 dark:bg-gray-900/50 px-2 py-1 rounded-full backdrop-blur-sm">
            <Lock size={12} />
            <span className="text-[9px] font-bold uppercase tracking-widest">Limit: 3</span>
          </div>
          
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((slotIdx) => {
              const item = semaphoreState?.active[slotIdx];
              return (
                <div key={slotIdx} className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold transition-all ${item ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 scale-110 shadow-sm' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-300'}`}>
                  {item || '-'}
                </div>
              );
            })}
          </div>

          <div className={`flex items-center gap-1.5 transition-opacity duration-300 ${semaphoreState?.queue && semaphoreState.queue.length > 0 ? 'opacity-100' : 'opacity-0'}`}>
            <div className="w-[1px] h-4 bg-gray-300 dark:bg-gray-700 mx-1"></div>
            {semaphoreState?.queue?.map((item, idx) => (
              <div key={idx} className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 shadow-sm">
                {item}
              </div>
            ))}
          </div>
        </div>



        {/* Abstract Data Paths */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30 dark:opacity-20 z-0">
           <line ref={lineUserMain} stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" className="text-gray-500" />
           <line ref={lineWorkerMain} stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" className="text-gray-500" />
           <line ref={lineMainUi} stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" className="text-gray-500" />
           <line ref={lineMainApi} stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" className="text-gray-500" />
           <line ref={lineApiDb} stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" className="text-gray-500" />
           <line ref={lineApiR2} stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" className="text-gray-500" />
           <path ref={pathMainR2} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-blue-500 opacity-60" />
           <path ref={pathR2Ui} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-purple-500 opacity-60" />
        </svg>

        {/* The 4 Photos */}
        <div ref={photoARef} className="absolute top-0 left-0 w-8 h-8 rounded shadow-md border-2 border-gray-900 dark:border-gray-100 flex items-center justify-center text-xs font-black z-40 bg-white text-gray-900 pointer-events-none transition-colors">A</div>
        <div ref={photoBRef} className="absolute top-0 left-0 w-8 h-8 rounded shadow-md border-2 border-gray-900 dark:border-gray-100 flex items-center justify-center text-xs font-black z-40 bg-white text-gray-900 pointer-events-none transition-colors">B</div>
        <div ref={photoCRef} className="absolute top-0 left-0 w-8 h-8 rounded shadow-md border-2 border-gray-900 dark:border-gray-100 flex items-center justify-center text-xs font-black z-40 bg-white text-gray-900 pointer-events-none transition-colors">C</div>
        <div ref={photoDRef} className="absolute top-0 left-0 w-8 h-8 rounded shadow-md border-2 border-gray-900 dark:border-gray-100 flex items-center justify-center text-xs font-black z-40 bg-white text-gray-900 pointer-events-none transition-colors">D</div>

        {/* Nodes Grid */}
        <div className="grid grid-cols-3 gap-x-8 gap-y-16 w-full max-w-2xl relative z-10 pt-12">
          
          <div className="flex flex-col gap-12 items-center">
            
            <div ref={userRef} className="w-28 flex flex-col items-center gap-1 p-2 bg-transparent opacity-80 z-10 -mb-6">
              <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-400 dark:border-gray-600 flex items-center justify-center mb-1 bg-white dark:bg-gray-800">
                <ImagePlus className="text-gray-500" size={16} />
              </div>
              <span className="text-[9px] font-bold text-center leading-tight text-gray-500 uppercase tracking-widest">Media Library<br/>Dropzone</span>
            </div>

            <div ref={workerRef} className="w-28 flex flex-col items-center gap-2 p-3 bg-white dark:bg-gray-800 border-2 border-orange-200 dark:border-orange-800 rounded-xl shadow-sm z-10">
              <Cpu className="text-orange-500" size={24} />
              <span className="text-[10px] font-bold text-center leading-tight">Background<br/>Workers (Pool)</span>
            </div>
            <div ref={mainRef} className="w-28 flex flex-col items-center gap-2 p-3 bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-800 rounded-xl shadow-sm z-10 relative">
              <Smartphone className="text-blue-500" size={24} />
              <span className="text-[10px] font-bold text-center leading-tight">Main Thread<br/>(Client)</span>
            </div>
            <div ref={uiRef} className="w-28 flex flex-col items-center gap-2 p-3 bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-800 rounded-xl shadow-sm z-10">
              <Globe className="text-purple-500" size={24} />
              <span className="text-[10px] font-bold text-center leading-tight">Public UI<br/>(Viewer)</span>
            </div>
          </div>

          <div className="flex flex-col justify-center items-center">
            <div ref={apiRef} className="w-28 flex flex-col items-center gap-2 p-3 bg-white dark:bg-gray-800 border-2 border-green-200 dark:border-green-800 rounded-xl shadow-sm z-10 relative">
              <Server className="text-green-500" size={24} />
              <span className="text-[10px] font-bold text-center leading-tight">Fastify API<br/>(Server)</span>
            </div>
          </div>

          <div className="flex flex-col gap-16 justify-center items-center">
            <div ref={r2Ref} className="w-28 flex flex-col items-center gap-2 p-3 bg-white dark:bg-gray-800 border-2 border-yellow-200 dark:border-yellow-800 rounded-xl shadow-sm z-10 relative">
              <Cloud className="text-yellow-500" size={24} />
              <span className="text-[10px] font-bold text-center leading-tight">Cloudflare R2<br/>(Edge Storage)</span>
            </div>
            <div ref={dbRef} className="w-28 flex flex-col items-center gap-2 p-3 bg-white dark:bg-gray-800 border-2 border-teal-200 dark:border-teal-800 rounded-xl shadow-sm z-10 relative">
              <Database className="text-teal-500" size={24} />
              <span className="text-[10px] font-bold text-center leading-tight">Neon DB<br/>(Ledger)</span>
            </div>
          </div>

        </div>
      </div>

      {/* RIGHT: Control Panel & Ledger */}
      <div className="w-full md:w-1/3 p-6 flex flex-col justify-between bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-xs font-bold rounded">
              Phase {currentPhase} / {PHASES.length - 1}
            </span>
            <div className="flex-1"></div>
            
            <button
              onClick={() => setSpeed(s => s === 1 ? 0.5 : s === 0.5 ? 0.25 : 1)}
              className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-xs font-bold text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 flex items-center gap-1"
            >
              <FastForward size={14} />
              {speed === 1 ? "1.0x Speed" : speed === 0.5 ? "0.5x Speed" : "0.25x Speed"}
            </button>

            <button 
              onClick={toggleAuto}
              className={`flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded transition-colors ${isAuto ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
              {isAuto ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
              {isAuto ? 'Auto Playing' : 'Auto Play'}
            </button>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{PHASES[currentPhase].title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
            {PHASES[currentPhase].description}
          </p>

          <ul className="space-y-4">
            {PHASES[currentPhase].steps.map((step, idx) => {
              const isActive = currentStep === idx;
              const isPast = currentStep > idx;
              return (
                <li key={idx} className={`flex items-start gap-3 transition-all duration-300 ${isActive ? 'opacity-100 scale-105 origin-left' : isPast ? 'opacity-60' : 'opacity-30'}`}>
                  <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                    {idx + 1}
                  </span>
                  <span className={`text-sm font-mono text-[11px] leading-tight mt-0.5 transition-colors ${isActive ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-700 dark:text-gray-300'}`}>
                    {step}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex gap-3">
          <button
            onClick={nextPhase}
            disabled={isPlaying || currentPhase === PHASES.length - 1}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {currentPhase === 0 ? "Start Flow" : "Next Phase"} <ArrowRight size={16} />
          </button>
          
          <button
            onClick={reset}
            disabled={isPlaying || currentPhase === 0}
            className="flex items-center justify-center p-2.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Reset to Start"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
