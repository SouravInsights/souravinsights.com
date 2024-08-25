"use client";

import React from "react";
import { motion } from "framer-motion";
import { ExternalLink, Sprout, Flower, Trees } from "lucide-react";
import { LinkData } from "../utils/discordApi";

interface LinkCardProps {
  link: LinkData;
}

const plantTypes = [Sprout, Flower, Trees];
const backgroundColors = [
  "from-pink-300 to-purple-300",
  "from-yellow-300 to-red-300",
  "from-green-300 to-blue-300",
  "from-indigo-300 to-purple-300",
  "from-red-300 to-yellow-300",
  "from-blue-300 to-green-300",
];

export default function LinkCard({ link }: LinkCardProps) {
  const PlantIcon = plantTypes[Math.floor(Math.random() * plantTypes.length)];
  const backgroundColorClass =
    backgroundColors[Math.floor(Math.random() * backgroundColors.length)];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ scale: 1.05 }}
      className="relative group h-full"
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${backgroundColorClass} rounded-lg transform -rotate-3 group-hover:rotate-0 transition-all duration-300 opacity-75`}
      ></div>
      <div className="relative bg-white bg-opacity-90 p-4 rounded-lg shadow-lg overflow-hidden h-full flex flex-col transform rotate-3 group-hover:rotate-0 transition-all duration-300">
        <div className="flex items-center mb-2">
          <PlantIcon className="w-8 h-8 mr-2 transform group-hover:scale-110 transition-transform duration-300 text-gray-700" />
          <h3 className="text-lg font-semibold truncate flex-grow">
            {link.title}
          </h3>
        </div>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex-grow">
          {link.url}
        </p>
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors duration-300"
        >
          Visit <ExternalLink className="ml-1" size={14} />
        </a>
      </div>
    </motion.div>
  );
}
