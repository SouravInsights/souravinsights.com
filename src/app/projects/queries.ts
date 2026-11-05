import { seedProjects, type Project } from "./projects-data";

const PROJECTS_REDIS_KEY = "projects:data";

/**
 * The ordered projects list, from Upstash over a Next-cached fetch.
 *
 * Deliberately not the `@upstash/redis` client here. That client fetches with
 * `cache: "no-store"` — right for a write, poison for a read on a static page:
 * Next sees a no-store fetch during prerender and drops the whole route to
 * dynamic, so every visitor pays a Redis round-trip for an order that changes a
 * few times a year.
 *
 * A GET with `revalidate` and a tag is cached once and shared by everyone, and
 * the save action's `revalidateTag("projects")` still makes an edit visible at
 * once. A cold or unreachable store falls back to the seed, so the page is never
 * empty.
 */
export async function getProjectsData(): Promise<Project[]> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return seedProjects;

  try {
    const response = await fetch(`${url}/get/${PROJECTS_REDIS_KEY}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 3600, tags: ["projects"] },
    });
    if (!response.ok) return seedProjects;

    const { result } = (await response.json()) as { result: string | null };
    if (!result) return seedProjects;

    const data = JSON.parse(result) as Project[];
    if (!Array.isArray(data) || data.length === 0) return seedProjects;
    return data;
  } catch (error) {
    console.error("Error reading projects from Redis:", error);
    return seedProjects;
  }
}
