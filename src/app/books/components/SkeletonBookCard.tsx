import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const SkeletonBookCard: React.FC = () => (
  <Card className="h-full overflow-hidden bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700">
    <CardContent className="p-0 relative">
      <Skeleton className="h-48 w-full" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-3 w-24" />
      </div>
    </CardContent>
  </Card>
);
