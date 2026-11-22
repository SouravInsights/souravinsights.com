"use client";

import React from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";

interface SideBySideProps {
  image1: string;
  label1: string;
  image2: string;
  label2: string;
  caption?: string;
}

export default function SideBySide({ image1, label1, image2, label2, caption }: SideBySideProps) {
  return (
    <div className="my-10 flex flex-col">
      <div className="flex w-full flex-col sm:flex-row gap-6 items-stretch">
        
        {/* Left Side */}
        <Dialog>
          <div className="group relative flex-1 flex flex-col rounded-2xl border border-gray-200/50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-900/50 p-2 shadow-sm">
            {/* Label Bar */}
            <div className="flex justify-center pb-3 pt-1">
              <span className="inline-flex items-center px-4 py-1 rounded-full text-xs font-medium bg-white dark:bg-black text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-800 transition-transform duration-300 group-hover:scale-105">
                {label1}
              </span>
            </div>
            {/* iOS like frame container */}
            <DialogTrigger asChild>
              <div className="relative w-full flex-1 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-inner aspect-video cursor-zoom-in">
                <Image 
                  src={image1} 
                  alt={label1} 
                  fill
                  className="object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </DialogTrigger>
          </div>
          <DialogContent className="w-[95vw] sm:w-full max-w-4xl bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 p-2 sm:p-4 rounded-xl shadow-2xl [&>button]:hidden focus:outline-none">
            <DialogTitle className="sr-only">{label1}</DialogTitle>
            <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-gray-200/50 dark:border-gray-800/50">
              <Image 
                src={image1} 
                alt={label1} 
                fill
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 1024px"
                priority
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Right Side */}
        <Dialog>
          <div className="group relative flex-1 flex flex-col rounded-2xl border border-gray-200/50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-900/50 p-2 shadow-sm">
            {/* Label Bar */}
            <div className="flex justify-center pb-3 pt-1">
              <span className="inline-flex items-center px-4 py-1 rounded-full text-xs font-medium bg-white dark:bg-black text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-800 transition-transform duration-300 group-hover:scale-105">
                {label2}
              </span>
            </div>
            {/* iOS like frame container */}
            <DialogTrigger asChild>
              <div className="relative w-full flex-1 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-inner aspect-video cursor-zoom-in">
                <Image 
                  src={image2} 
                  alt={label2} 
                  fill
                  className="object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </DialogTrigger>
          </div>
          <DialogContent className="w-[95vw] sm:w-full max-w-4xl bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 p-2 sm:p-4 rounded-xl shadow-2xl [&>button]:hidden focus:outline-none">
            <DialogTitle className="sr-only">{label2}</DialogTitle>
            <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-gray-200/50 dark:border-gray-800/50">
              <Image 
                src={image2} 
                alt={label2} 
                fill
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 1024px"
                priority
              />
            </div>
          </DialogContent>
        </Dialog>

      </div>
      {caption && (
        <p className="mt-4 text-sm text-center text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
          {caption}
        </p>
      )}
    </div>
  );
}
