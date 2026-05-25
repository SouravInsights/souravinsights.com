"use client";

import React, { useState } from 'react';
import { Terminal, Layout } from 'lucide-react';

export default function HtmlNestingVisualizer() {
  const [isBroken, setIsBroken] = useState(true);

  return (
    <div className="my-10 flex flex-col rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 overflow-hidden shadow-sm">
      
      {/* Top Toggle Bar & Explanation */}
      <div className="flex flex-col items-center p-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="flex flex-col sm:flex-row bg-gray-100 dark:bg-gray-900 p-1 rounded-xl shadow-inner mb-4 w-full sm:w-auto">
          <button 
            onClick={() => setIsBroken(true)}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all w-full sm:w-auto ${
              isBroken 
                ? 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            The Bug (Invalid HTML)
          </button>
          <button 
            onClick={() => setIsBroken(false)}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all w-full sm:w-auto ${
              !isBroken 
                ? 'bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            The Fix (Valid HTML)
          </button>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-lg text-center leading-relaxed min-h-[40px] flex items-center justify-center">
          {isBroken 
            ? "Browsers don't allow a button inside a button. It auto-closes the tags to try and fix it, causing our main container to close way too early."
            : "Changing the outer element to a div makes the HTML valid. The browser doesn't interfere, and our layout container stays open!"}
        </p>
      </div>

      <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-800">
        
        {/* Left Side: Code Preview */}
        <div className="flex-1 p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4 text-sm font-medium text-gray-500 dark:text-gray-400">
            <Terminal size={16} />
            <span>What we wrote (React Code)</span>
          </div>
          <div className="flex-1 bg-gray-950 rounded-xl p-4 overflow-x-auto relative font-mono text-sm shadow-inner text-gray-300 leading-relaxed">
            <pre className="mt-2 min-w-max">
              <span className="text-pink-400">return</span> (
              {'\n'}  <span className="text-blue-400">&lt;div</span> <span className="text-green-300">className</span>=<span className="text-yellow-300">&quot;max-w-4xl mx-auto&quot;</span><span className="text-blue-400">&gt;</span>
              
              {'\n\n'}    <span className="text-gray-500">{`{/* Flag Picker */}`}</span>
              {isBroken ? (
                <div className="bg-red-500/20 -mx-4 px-4 py-2 border-l-2 border-red-500">
                  {'\n'}{`    `}<span className="text-blue-400">&lt;button</span> <span className="text-green-300">className</span>=<span className="text-yellow-300">&quot;trigger&quot;</span><span className="text-blue-400">&gt;</span>
                  {'\n'}{`      `}<span className="text-blue-400">&lt;FlagIcon /&gt;</span>
                  {'\n'}{`      `}<span className="text-blue-400">&lt;button&gt;</span>Clear<span className="text-blue-400">&lt;/button&gt;</span>
                  {'\n'}{`    `}<span className="text-blue-400">&lt;/button&gt;</span>
                  {'\n'}
                </div>
              ) : (
                <div className="bg-green-500/20 -mx-4 px-4 py-2 border-l-2 border-green-500">
                  {'\n'}{`    `}<span className="text-blue-400">&lt;div</span> <span className="text-green-300">role</span>=<span className="text-yellow-300">&quot;button&quot;</span> <span className="text-green-300">className</span>=<span className="text-yellow-300">&quot;trigger&quot;</span><span className="text-blue-400">&gt;</span>
                  {'\n'}{`      `}<span className="text-blue-400">&lt;FlagIcon /&gt;</span>
                  {'\n'}{`      `}<span className="text-blue-400">&lt;button&gt;</span>Clear<span className="text-blue-400">&lt;/button&gt;</span>
                  {'\n'}{`    `}<span className="text-blue-400">&lt;/div&gt;</span>
                  {'\n'}
                </div>
              )}
              
              {'\n'}    <span className="text-gray-500">{`{/* Trip Cards Grid */}`}</span>
              {'\n'}    <span className="text-blue-400">&lt;TripCardsGrid /&gt;</span>
              
              {'\n\n'}  <span className="text-blue-400">&lt;/div&gt;</span>
              {'\n'});
            </pre>
          </div>
        </div>

        {/* Right Side: UI Preview */}
        <div className="flex-1 p-6 flex flex-col bg-gray-100/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-2 mb-4 text-sm font-medium text-gray-500 dark:text-gray-400">
            <Layout size={16} />
            <span>What the browser actually rendered</span>
          </div>
          
          {/* Mini Browser */}
          <div className="flex-1 bg-gray-200 dark:bg-gray-950 rounded-xl overflow-hidden border border-gray-300 dark:border-gray-800 shadow-sm flex flex-col relative min-h-[300px]">
            {/* Browser Header */}
            <div className="h-6 bg-gray-300 dark:bg-gray-900 border-b border-gray-400/30 dark:border-gray-800 flex items-center px-3 gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400 dark:bg-gray-700"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 dark:bg-gray-700"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-400 dark:bg-gray-700"></div>
            </div>
            
            {/* Browser Body */}
            <div className="flex-1 py-4 flex flex-col relative">
              {/* The "max-w-4xl mx-auto" container boundary visualized */}
              <div className="mx-auto w-[90%] sm:w-[80%] md:w-[60%] border-x border-dashed border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-900 transition-all duration-500 ease-in-out flex flex-col items-center pt-6 pb-2 relative z-10"
                   style={{ height: isBroken ? '120px' : '100%', borderBottomWidth: isBroken ? '0px' : '1px' }}>
                
                {/* Header Profile Area inside container */}
                <div className="w-[85%] h-16 bg-gray-100 dark:bg-gray-800 rounded-lg p-3 flex flex-col gap-2 relative">
                  <div className="w-1/3 h-2 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                  {/* Flag Picker Mock */}
                  <div className={`w-16 h-4 rounded mt-1 border ${isBroken ? 'bg-red-100 border-red-300 dark:bg-red-900/40 dark:border-red-700' : 'bg-green-100 border-green-300 dark:bg-green-900/40 dark:border-green-700'}`}></div>
                </div>

                {!isBroken && (
                  <div className="w-full px-2 sm:px-4 mt-6 animate-in fade-in duration-500">
                    <div className="grid grid-cols-3 gap-1 sm:gap-2">
                      <div className="h-16 bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md"></div>
                      <div className="h-16 bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md"></div>
                      <div className="h-16 bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md"></div>
                    </div>
                  </div>
                )}
                
                {isBroken && (
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[10px] bg-red-100 text-red-600 dark:bg-red-900/80 dark:text-red-300 px-2 py-0.5 rounded-full font-mono shadow-sm whitespace-nowrap border border-red-200 dark:border-red-800">
                    Main container closed too early!
                  </div>
                )}
              </div>

              {isBroken && (
                <div className="w-full px-4 mt-6 absolute top-[120px] left-0 z-0 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="h-24 bg-red-100/80 dark:bg-red-900/20 border border-red-300 dark:border-red-800/50 rounded-md shadow-sm"></div>
                    <div className="h-24 bg-red-100/80 dark:bg-red-900/20 border border-red-300 dark:border-red-800/50 rounded-md shadow-sm"></div>
                    <div className="h-24 bg-red-100/80 dark:bg-red-900/20 border border-red-300 dark:border-red-800/50 rounded-md shadow-sm"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
