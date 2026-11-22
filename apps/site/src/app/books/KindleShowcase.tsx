/* eslint-disable react/no-unescaped-entities */
"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

export const KindleShowcase: React.FC = () => {
  const kindleImages = ["/kindle1.jpg", "/kindle2.jpg", "/kindle3.jpg"];

  return (
    <motion.div
      className="my-8 p-4 md:p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col space-y-2 mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-green-700 dark:text-green-400 text-center">
          My Reading Companion
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-300">
          It's like carrying a whole library without the backache! One digital
          page at a time... 😬
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:flex items-center justify-center gap-4 md:gap-8">
        {kindleImages.map((src, index) => (
          <motion.div
            key={src}
            className="relative w-full sm:w-64 h-64 sm:h-80 rounded-lg overflow-hidden shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.2, duration: 0.5 }}
            whileHover={{ scale: 1.05, rotate: index % 2 === 0 ? 2 : -2 }}
          >
            <Image
              src={src}
              alt={`Kindle Oasis ${index + 1}`}
              fill
              style={{ objectFit: "cover" }}
              className="rounded-lg"
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
