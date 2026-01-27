"use client";

import React, { useEffect } from "react";
import { Eye } from "lucide-react";
import { usePostViews } from "@/hooks/usePostViews";
import { motion } from "framer-motion";
import posthog from "posthog-js";

interface ViewCounterProps {
  slug: string;
}

const ViewCounter = ({ slug }: ViewCounterProps) => {
  const { views, isLoading } = usePostViews({ slug });

  // Track post views in PostHog once data is loaded
  // Adding extra properties to make analysis more useful later on
  useEffect(() => {
    if (!isLoading && views > 0) {
      posthog.capture("blog_post_viewed", {
        slug: slug,
        view_count: views,
        // Helps identify which posts bring readers back
        is_returning_view: views > 1,
        // Categorizes posts by popularity for easier reporting
        view_milestone: getViewMilestone(views),
      });
    }
  }, [views, isLoading, slug]);

  // Convert raw view counts into readable milestones
  // This makes PostHog reports much more useful than just seeing raw numbers
  // For example, I can easily filter to see all posts that reached 1k+ views
  const getViewMilestone = (viewCount: number): string => {
    if (viewCount >= 10000) return "10k+";
    if (viewCount >= 5000) return "5k+";
    if (viewCount >= 1000) return "1k+";
    if (viewCount >= 500) return "500+";
    if (viewCount >= 100) return "100+";
    if (viewCount >= 50) return "50+";
    if (viewCount >= 10) return "10+";
    return "new";
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="flex items-center gap-1.5 text-muted-foreground"
    >
      <Eye size={16} className="text-muted-foreground" />
      <span className="text-sm font-mono">
        {isLoading ? (
          <span className="animate-pulse">...</span>
        ) : (
          `${views.toLocaleString()} view${views !== 1 ? "s" : ""}`
        )}
      </span>
    </motion.div>
  );
};

export default ViewCounter;
