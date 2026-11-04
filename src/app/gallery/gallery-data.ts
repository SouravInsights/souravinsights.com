/**
 * The Gallery's content, kept apart from the page so adding a clip is a data
 * edit and never a component edit.
 *
 * Media lives in Cloudflare R2, one folder per project:
 *
 *   <R2_PUBLIC_URL>/<project>/<file>
 *   e.g. https://…r2.dev/beenthere/beenthere-editor-experience.mp4
 *
 * To add a clip:
 *   1. Optimise the recording into `souravinsights-assets/optimized-recordings`
 *      (H.264, yuv420p, `+faststart`, no audio, 1600px wide) and export a
 *      `…-poster.webp` beside it.
 *   2. `node scripts/upload-gallery-r2.mjs` — the file's own prefix picks the
 *      project folder.
 *   3. Add one entry below.
 *
 * The originals in `og-recordings` are never touched.
 */

export interface GalleryProject {
  /** Stable key, referenced by `GalleryVideo.project` and the R2 folder. */
  key: string;
  name: string;
  url?: string;
}

export interface GalleryVideo {
  id: string;
  title: string;
  /** A `GalleryProject.key`. */
  project: string;
  /** The note shown in the detail view. */
  notes: string;
  src: string;
  poster: string;
  /** Intrinsic video dimensions, so the frame reserves its space. */
  width: number;
  height: number;
  /** Seconds. Shown before the video loads. */
  duration: number;
  /** Whether the file has an audio track worth a mute control. */
  hasAudio: boolean;
  tags: string[];
  /** ISO date the interaction was recorded. */
  recordedAt: string;
}

/**
 * The bucket's public base. Public by definition, so it doubles as the fallback
 * when the env is absent (a local checkout without `.env` still renders).
 */
const R2_BASE = (
  process.env.R2_PUBLIC_URL ?? "https://pub-571f767160b845dc919f10d98335c957.r2.dev"
).replace(/\/+$/, "");

/** Public URL for one object, under its project folder. */
const clip = (project: string, file: string) => `${R2_BASE}/${project}/${file}`;

export const galleryProjects: GalleryProject[] = [
  { key: "beenthere", name: "Beenthere", url: "https://www.beenthere.page/" },
  { key: "spotfree", name: "Spotfree" },
];

/** Newest first. The filter re-groups them by project. */
export const galleryVideos: GalleryVideo[] = [
  {
    id: "beenthere-editor-experience",
    title: "Editor experience",
    project: "beenthere",
    notes:
      "Writing a trip entry from start to finish: the title growing with the words, the cover settling into place, and the save state staying honest the whole way through.",
    src: clip("beenthere", "beenthere-editor-experience.mp4"),
    poster: clip("beenthere", "beenthere-editor-experience-poster.webp"),
    width: 1600,
    height: 1000,
    duration: 111.58,
    hasAudio: false,
    tags: ["Editor", "Writing"],
    recordedAt: "2025-11-04",
  },
  {
    id: "beenthere-live-preview-experience",
    title: "Live preview",
    project: "beenthere",
    notes:
      "Typing on one side, the entry taking shape on the other — kept in step frame by frame rather than after a debounce.",
    src: clip("beenthere", "beenthere-live-preview-experience.mp4"),
    poster: clip("beenthere", "beenthere-live-preview-experience-poster.webp"),
    width: 1600,
    height: 1000,
    duration: 16.22,
    hasAudio: false,
    tags: ["Editor", "Live preview"],
    recordedAt: "2025-11-04",
  },
  {
    id: "beenthere-editor-scroll-scrubber",
    title: "Editor scroll scrubber",
    project: "beenthere",
    notes:
      "The editor's scroll scrubber: moving through a long entry without losing your place, in a way a plain scrollbar never manages.",
    src: clip("beenthere", "beenthere-editor-scroll-scrubber.mp4"),
    poster: clip("beenthere", "beenthere-editor-scroll-scrubber-poster.webp"),
    width: 1600,
    height: 1000,
    duration: 10.15,
    hasAudio: false,
    tags: ["Editor", "Scrolling"],
    recordedAt: "2025-11-04",
  },
  {
    id: "beenthere-background-picker-ui",
    title: "Background picker",
    project: "beenthere",
    notes:
      "Choosing a cover treatment against the real thing rather than a swatch, so the decision is made on what you will actually see.",
    src: clip("beenthere", "beenthere-background-picker-ui.mp4"),
    poster: clip("beenthere", "beenthere-background-picker-ui-poster.webp"),
    width: 1600,
    height: 1000,
    duration: 51.17,
    hasAudio: false,
    tags: ["Picker", "Covers"],
    recordedAt: "2025-11-03",
  },
  {
    id: "beenthere-media-library-ui",
    title: "Media library",
    project: "beenthere",
    notes:
      "A trip's photos in one grid: selecting, reordering, and an empty state that shares the same quiet rhythm as the rest.",
    src: clip("beenthere", "beenthere-media-library-ui.mp4"),
    poster: clip("beenthere", "beenthere-media-library-ui-poster.webp"),
    width: 1600,
    height: 1000,
    duration: 105.6,
    hasAudio: false,
    tags: ["Grid", "Selection"],
    recordedAt: "2025-11-03",
  },
  {
    id: "beenthere-landingpage",
    title: "Landing page",
    project: "beenthere",
    notes:
      "How a quiet travel app explains itself in one screen, without a wall of screenshots to scroll past.",
    src: clip("beenthere", "beenthere-landingpage.mp4"),
    poster: clip("beenthere", "beenthere-landingpage-poster.webp"),
    width: 1600,
    height: 1000,
    duration: 49.25,
    hasAudio: false,
    tags: ["Landing page", "Marketing"],
    recordedAt: "2025-11-03",
  },
  {
    id: "spotfree-playful-footer",
    title: "Playful footer",
    project: "spotfree",
    notes:
      "The bottom of the page, where a footer usually gives up. Links settle in on scroll and the mark answers the pointer.",
    src: clip("spotfree", "spotfree-playful-footer.mp4"),
    poster: clip("spotfree", "spotfree-playful-footer-poster.webp"),
    width: 1600,
    height: 1000,
    duration: 33.03,
    hasAudio: false,
    tags: ["Motion", "Details"],
    recordedAt: "2025-11-03",
  },
  {
    id: "spotfree-page-builder-ui",
    title: "Page builder canvas",
    project: "spotfree",
    notes:
      "Dragging a block onto the canvas, reordering it, and watching the surrounding sections make room without a hard jump.",
    src: clip("spotfree", "spotfree-page-builder-ui.mp4"),
    poster: clip("spotfree", "spotfree-page-builder-ui-poster.webp"),
    width: 1600,
    height: 1000,
    duration: 46.28,
    hasAudio: false,
    tags: ["Drag and drop", "Editor"],
    recordedAt: "2025-11-03",
  },
  {
    id: "spotfree-icon-animations",
    title: "Service icon interactions",
    project: "spotfree",
    notes:
      "Picking a service should feel physical before you commit to it. On pointer-over each icon lifts, tilts and settles back on its own baseline, so the row reads as a set of objects rather than a grid of buttons. On touch the same gesture answers the tap.",
    src: clip("spotfree", "spotfree-icon-animations.mp4"),
    poster: clip("spotfree", "spotfree-icon-animations-poster.webp"),
    width: 1600,
    height: 1000,
    duration: 11.73,
    hasAudio: false,
    tags: ["Micro-interactions", "Icons"],
    recordedAt: "2025-11-03",
  },
];
