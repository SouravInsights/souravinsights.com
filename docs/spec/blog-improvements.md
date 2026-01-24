# Blog Architecture & Performance Spec

## Overview

I am upgrading the blog's architecture to maximize performance (Core Web Vitals), ensure perfect SEO indexability, and maintain rich interactivity. The goal is to leverage Next.js App Router's full capabilities—specifically moving from dynamic rendering to Static Site Generation (SSG) and optimizing heavy client components.

## Current Bottlenecks

1.  **Dynamic Rendering**: Currently, `src/app/blog/[slug]/page.tsx` lacks `generateStaticParams`. This forces Next.js to server-render every blog post on demand (Node.js runtime) rather than serving static HTML from the Edge. This is the primary cause of the "slow" feeling—hitting a cold start or server computation on every page load.
2.  **Bundle Size & Hydration**: Heavy components like `Playground` (Sandpack) are imported directly. Even with `next-mdx-remote`, these client components are being bundled and likely hydrated immediately, blocking the main thread.
3.  **Missing SEO Primitives**: The site lacks `sitemap.ts` and `robots.ts`, which hurts crawlability.

## Proposed Architecture

I will stick with the **App Router** + **RSC** (React Server Components) model but enforce **Static Generation**.

### 1. Rendering Strategy: Static Site Generation (SSG)

I need to pre-render all blog posts at build time. Since the content is file-based (MDX), all paths are known ahead of time.

-   **Action**: Implement `generateStaticParams` in `src/app/blog/[slug]/page.tsx`.
-   **Result**: Blog posts become static HTML files served from the CDN (Vercel Edge Network). TTFB (Time to First Byte) will drop significantly.

### 2. Component Architecture: Server vs. Client

I will strictly draw lines between server and client domains to minimize the JS payload.

| Component | Strategy |
| :--- | :--- |
| **Blog Layout & Content** | **Server Component**. Zero client-side JS for the text itself. |
| **Code Blocks (`pre`)** | **Server Component** (via `rehype-pretty-code`). Highlighting happens at build time. No `shiki` bundle on client. |
| **Playground (Sandpack)** | **Client Component (Lazy)**. Must be lazy-loaded with `next/dynamic`. It should not load until the user scrolls it into view or interacts. |
| **Like Button** | **Client Component**. Needs to be interactive. Should load immediately but be lightweight. |
| **TOC** | **Client Component**. Uses `IntersectionObserver` for active states. |

### 3. Performance Optimizations

*   **Lazy Loading**: Change the `Playground` import in `page.tsx` to a dynamic import with a custom loading skeleton.
    ```tsx
    const Playground = dynamic(() => import('../components/Playground'), {
      loading: () => <PlaygroundSkeleton />,
      ssr: false // Sandpack doesn't need SSR
    })
    ```
*   **Font Optimization**: Ensure `next/font` is configured correctly (already seems okay, but I'll double-check `layout.tsx`).

### 4. SEO & Indexability

*   **Metadata**: Continue using `generateMetadata`.
*   **Sitemap**: Create `src/app/sitemap.ts` to automatically generate a sitemap for all blog posts.
*   **Robots**: Create `src/app/robots.ts` to guide crawlers.
*   **JSON-LD**: Add structured data (`BlogPosting` schema) to `page.tsx`.

## Implementation Plan

1.  **SEO Foundation**: Add `sitemap.ts` and `robots.ts`.
2.  **Switch to SSG**: Add `generateStaticParams` to `src/app/blog/[slug]/page.tsx`.
3.  **Optimize Components**: Refactor `Playground` imports to use `next/dynamic`.
4.  **Verification**: Run a local build (`npm run build`) to ensure pages are marked as `● (Static)`.

## Questions / Risks

*   **Build Time**: With many sandpacks, build time might increase. I can mitigate this by ensuring `Sandpack` itself isn't running during build (it's client-side only).
*   **Dynamic Features**: If the "Like" button needs to fetch real-time counts, it will fetch on mount. The initial static HTML will show a placeholder or "0" (unless I use ISR/Revalidation, but client-fetch is better for real-time likes).
