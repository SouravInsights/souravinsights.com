import { getProjectsData } from "@/app/projects/queries";
import { splitProjects } from "@/app/projects/projects-data";
import { HomeClient } from "./HomeClient";

/**
 * The home page is a client dashboard, so the side-projects order is resolved
 * here and handed down. `getProjectsData` is cached, so this stays statically
 * rendered — a visitor never waits on Redis for an order that changes a few
 * times a year. A save revalidates the tag.
 */
export default async function Home() {
  const { featured } = splitProjects(await getProjectsData());
  return <HomeClient featuredProjects={featured} />;
}
