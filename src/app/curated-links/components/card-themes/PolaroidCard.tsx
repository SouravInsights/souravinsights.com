import React from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import posthog from "posthog-js";

interface CardProps {
  title: string;
  description: string;
  url: string;
  gradientStart: string;
  gradientEnd: string;
}

export function PolaroidCard({
  title,
  description,
  url,
  gradientStart,
  gradientEnd,
}: CardProps) {
  const handleLinkClick = () => {
    posthog.capture("link_clicked_polaroid_card", { url });
  };

  const gradientStyle = {
    background: `linear-gradient(to bottom right, ${gradientStart}, ${gradientEnd})`,
  };

  return (
    <Link href={url}>
      <motion.div
        whileHover={{ scale: 1.05, rotate: 0 }}
        className="group bg-white dark:bg-card p-3 shadow-md h-full flex flex-col"
        style={{ transformOrigin: "center" }}
      >
        <div className="h-32 mb-4 rounded-sm" style={gradientStyle}></div>
        <div className="px-2 flex flex-col flex-grow">
          <h3 className="text-lg font-semibold mb-2 truncate dark:text-foreground">{title}</h3>
          <p className={`text-sm mb-4 line-clamp-3 dark:text-muted-foreground`}>{description}</p>
          <div className="mt-auto">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm font-medium hover:text-green-300 dark:text-muted-foreground dark:hover:text-green-400"
              onClick={handleLinkClick}
            >
              Visit <ExternalLink className="ml-1 flex-shrink-0" size={14} />
            </a>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
