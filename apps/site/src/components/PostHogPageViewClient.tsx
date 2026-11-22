"use client";

import dynamic from "next/dynamic";

// PostHog reads `useSearchParams`, which forces a client bailout during static
// prerender unless it never renders on the server. A client wrapper is what
// carries `ssr: false` now that server components may not.
const PostHogPageView = dynamic(() => import("@/components/PostHogPageView"), {
  ssr: false,
});

export default PostHogPageView;
