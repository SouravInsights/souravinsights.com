"use client";

import dynamic from "next/dynamic";

// Sandpack is browser-only and heavy. A client wrapper is what carries
// `ssr: false` now that server components may not.
const Playground = dynamic(() => import("./Playground"), {
  ssr: false,
  loading: () => (
    <div className="my-8 h-[350px] w-full rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse border border-gray-200 dark:border-gray-700" />
  ),
});

export default Playground;
