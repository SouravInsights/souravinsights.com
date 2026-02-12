import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const SkeletonBookCard: React.FC = () => (
  <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg">
    <Skeleton className="h-full w-full" />
  </div>
);
