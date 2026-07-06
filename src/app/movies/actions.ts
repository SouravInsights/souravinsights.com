"use server";

import redis from "@/app/lib/redis";
import { MoviesData, emptyMoviesData } from "@/types/movies";
import { cookies } from "next/headers";

const MOVIES_REDIS_KEY = "movies:data";

export async function getMoviesData(): Promise<MoviesData> {
  try {
    const data = await redis.get<MoviesData>(MOVIES_REDIS_KEY);
    if (!data) {
      return emptyMoviesData;
    }
    return data;
  } catch (error) {
    console.error("Error fetching movies data from Redis:", error);
    return emptyMoviesData;
  }
}

export async function loginAdmin(secret: string): Promise<boolean> {
  const expectedSecret = process.env.CV_EDIT_SECRET || process.env.ADMIN_API_KEY;
  if (!expectedSecret || secret !== expectedSecret) {
    return false;
  }

  cookies().set("admin_session", secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  return true;
}

export async function saveMoviesData(data: MoviesData): Promise<{ success: boolean; error?: string }> {
  const expectedSecret = process.env.CV_EDIT_SECRET || process.env.ADMIN_API_KEY;
  const sessionCookie = cookies().get("admin_session");

  if (!expectedSecret || sessionCookie?.value !== expectedSecret) {
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
