"use client";

import React from "react";
import { ExternalLink } from "lucide-react";

interface HackerNewsButtonProps {
  url: string;
}

export default function HackerNewsButton({ url }: HackerNewsButtonProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#ff6600] hover:bg-[#ff7700] rounded-lg transition-all duration-200 shadow-sm hover:shadow-md group"
    >
      {/* HN Logo */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <rect width="16" height="16" rx="2" fill="white" />
        <path
          d="M8.5 9.5V13H7.5V9.5L4.5 3H5.7L8 8.3L10.3 3H11.5L8.5 9.5Z"
          fill="#ff6600"
        />
      </svg>
      <span>Discuss on HN</span>
      <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}
