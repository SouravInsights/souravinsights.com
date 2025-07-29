"use client";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";

if (typeof window !== "undefined") {
  // Check if this is an internal user via URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const internalKey = process.env.NEXT_PUBLIC_INTERNAL_USER_KEY;
  const urlInternalParam = urlParams.get("internal");
  const isInternalUser = internalKey && urlInternalParam === internalKey;

  // Check environment variable (for local development)
  const excludeFromEnv = process.env.NEXT_PUBLIC_EXCLUDE_TRACKING === "true";

  // If internal user parameter is present, store it in localStorage for future visits
  if (isInternalUser) {
    localStorage.setItem("posthog_internal_user", "true");
  }

  // Check if user was previously marked as internal
  const wasMarkedInternal =
    localStorage.getItem("posthog_internal_user") === "true";

  if (!excludeFromEnv) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      person_profiles: "identified_only",
      capture_pageview: false,
    });

    // Set user properties if this is an internal user
    if (isInternalUser || wasMarkedInternal) {
      posthog.setPersonProperties({
        is_internal_user: true,
        internal_user_type: "site_owner",
      });
    }
  }
}

export function PHProvider({ children }: { children: React.ReactNode }) {
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
