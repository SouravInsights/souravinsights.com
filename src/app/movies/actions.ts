"use server";

import redis from "@/app/lib/redis";
import { MoviesData, emptyMoviesData } from "@/types/movies";
import { isAdminAuthenticated, loginAdmin } from "@/lib/admin-auth";

export { loginAdmin };

const MOVIES_REDIS_KEY = "movies:data";

export async function getMoviesData(): Promise<MoviesData> {
  try {
    const data = await redis.get<MoviesData>(MOVIES_REDIS_KEY);
    if (!data) return emptyMoviesData;
    return data;
  } catch (error) {
    console.error("Error fetching movies data from Redis:", error);
    return emptyMoviesData;
  }
}

export async function saveMoviesData(
  data: MoviesData
): Promise<{ success: boolean; error?: string }> {
  if (!isAdminAuthenticated()) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await redis.set(MOVIES_REDIS_KEY, data);
    return { success: true };
  } catch (error) {
    console.error("Error saving movies data to Redis:", error);
    return { success: false, error: "Failed to save data" };
  }
}
