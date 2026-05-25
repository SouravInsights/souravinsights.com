"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, LayoutGrid } from 'lucide-react';

export default function DomTreeAnimator() {
  const [isBroken, setIsBroken] = useState(false);

  return (
    <div className="my-10 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 overflow-hidden shadow-sm">
      
      {/* Header, Toggle & Explanation */}
      <div className="flex flex-col items-center p-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="flex flex-col sm:flex-row bg-gray-100 dark:bg-gray-900 p-1 rounded-xl shadow-inner mb-4 w-full sm:w-auto">
          <button 
            onClick={() => setIsBroken(false)}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all w-full sm:w-auto ${
              !isBroken 
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            The Intended Structure
          </button>
          <button 
            onClick={() => setIsBroken(true)}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all w-full sm:w-auto ${
              isBroken 
                ? 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            The Broken Structure
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-lg text-center leading-relaxed min-h-[40px] sm:min-h-0 sm:h-5 flex items-center justify-center">
          {!isBroken 
            ? "React expects the Trip Grid to live safely nested inside the Main Container."
            : "Because the container closed early, the Trip Grid fell outside and became a sibling!"}
        </p>
      </div>

      {/* Animation Area */}
      <div className="p-8 md:p-12 min-h-[350px] flex items-center justify-center bg-gray-100/50 dark:bg-gray-950/50 relative">
        
        <div className="w-full max-w-md flex flex-col gap-5 relative">
          
          {/* Main Container */}
          <div className={`relative p-6 rounded-xl border-2 transition-colors duration-500 mt-4 mb-4 ${
            isBroken 
              ? 'border-red-400/40 bg-red-50/30 dark:border-red-900/50 dark:bg-red-900/10' 
              : 'border-dashed border-blue-400/50 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-900/10'
          }`}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-0.5 rounded-full text-[10px] font-mono font-semibold shadow-sm border
              bg-white text-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 transition-colors">
              Main Layout Container (div.max-w-6xl)
            </div>

            <div className="flex flex-col gap-3 mt-2">
              {/* Header Node */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
                <div className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400">
                  <User size={14} />
                </div>
                <span className="font-mono text-sm text-gray-700 dark:text-gray-300">ProfileHeader</span>
              </div>

              {/* Grid Node (When Intended) */}
              {!isBroken && (
                <motion.div 
                  layoutId="trip-grid"
                  className="flex items-center gap-3 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm z-10"
                >
                  <div className="w-6 h-6 rounded bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-500 dark:text-indigo-400">
                    <LayoutGrid size={14} />
                  </div>
                  <span className="font-mono text-sm text-indigo-700 dark:text-indigo-300 truncate">TripCardGrid</span>
                  <span className="ml-auto whitespace-nowrap text-[10px] uppercase tracking-wider text-indigo-600 font-bold bg-indigo-100 dark:bg-indigo-900/50 px-2 py-1 rounded">Safely Inside</span>
                </motion.div>
              )}
            </div>
            
            {/* The closing tag visual indicator */}
            {isBroken && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-0.5 rounded-full text-[10px] font-mono font-bold shadow-sm border bg-red-100 text-red-600 border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-800"
              >
                &lt;/div&gt; closes early!
              </motion.div>
            )}
          </div>

          {/* Grid Node (When Broken) */}
          {isBroken && (
            <motion.div 
              layoutId="trip-grid"
              className="flex items-center gap-3 p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 shadow-sm z-10 w-[110%] -ml-[5%]"
            >
              <div className="w-6 h-6 rounded bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-500 dark:text-red-400">
                <LayoutGrid size={14} />
              </div>
              <span className="font-mono text-sm text-red-700 dark:text-red-300">TripCardGrid</span>
              <span className="ml-auto text-[10px] uppercase tracking-wider text-red-600 font-bold bg-red-100 dark:bg-red-900/50 px-2 py-1 rounded shadow-sm border border-red-200 dark:border-red-800">Fell Outside!</span>
            </motion.div>
          )}

        </div>
        
      </div>
    </div>
  );
}
