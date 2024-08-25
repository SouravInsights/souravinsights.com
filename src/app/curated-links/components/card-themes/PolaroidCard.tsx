import React from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

interface CardProps {
  title: string;
  url: string;
  gradientStart: string;
  gradientEnd: string;
}

export function PolaroidCard({
  title,
  url,
  gradientStart,
  gradientEnd,
}: CardProps) {
  const gradientStyle = {
    background: `linear-gradient(to bottom right, ${gradientStart}, ${gradientEnd})`,
  };

  return (
    <Link href={url}>
      <motion.div
        whileHover={{ scale: 1.05, rotate: 0 }}
        className="group bg-white p-3 shadow-md h-full flex flex-col"
        style={{ transformOrigin: "center" }}
      >
        <div className="h-32 mb-4 rounded-sm" style={gradientStyle}></div>
        <div className="px-2 flex flex-col flex-grow">
          <h3 className="text-lg font-semibold mb-2 truncate">{title}</h3>
          <p className="text-sm text-gray-600 mb-4 truncate">{url}</p>
        </div>
      </motion.div>
    </Link>
  );
}
