import posthog from "posthog-js";
import { PostHog } from "posthog-js";

export const posthogClient: PostHog | undefined =
  typeof window !== "undefined" ? posthog : undefined;

export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY!;

// Check whether PostHog is client-side
if (typeof window !== "undefined") {
  posthog.init(POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    // Enable debug mode in development
    loaded: (posthog) => {
      if (process.env.NODE_ENV === "development") posthog.debug();
    },
  });
}
