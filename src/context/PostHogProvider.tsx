"use client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { posthogClient } from "@/utils/posthog";

export default function PostHogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname;
      if (searchParams && searchParams.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      posthogClient?.capture("$pageview", {
        $current_url: url,
      });
    }
  }, [pathname, searchParams]);

  return children;
}
