"use server";

import redis from "@/app/lib/redis";
import { MoviesData, emptyMoviesData } from "@/types/movies";
import { isAdminAuthenticated, loginAdmin } from "@/lib/admin-auth";
import { put } from "@vercel/blob";

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

export async function uploadPoster(formData: FormData): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!isAdminAuthenticated()) {
    return { success: false, error: "Unauthorized" };
  }

  const file = formData.get("file") as File;
  if (!file) {
    return { success: false, error: "No file provided" };
  }

  try {
    const blob = await put(`posters/${Date.now()}-${file.name}`, file, {
      access: "public",
    });
    return { success: true, url: blob.url };
  } catch (error) {
    console.error("Error uploading to blob:", error);
    return { success: false, error: "Failed to upload image" };
  }
}
