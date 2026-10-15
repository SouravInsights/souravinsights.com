"use server";

import redis from "@/app/lib/redis";
import { CVData, defaultCVData } from "@/types/cv";
import { isAdminAuthenticated } from "@/lib/admin-auth";

const CV_REDIS_KEY = "cv:data";

export async function getCVData(): Promise<CVData> {
  try {
    const data = await redis.get<CVData>(CV_REDIS_KEY);
    if (!data) return defaultCVData;
    return data;
  } catch (error) {
    console.error("Error fetching CV data from Redis:", error);
    return defaultCVData;
  }
}

export async function saveCVData(
  data: CVData
): Promise<{ success: boolean; error?: string }> {
  if (!isAdminAuthenticated()) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await redis.set(CV_REDIS_KEY, data);
    return { success: true };
  } catch (error) {
    console.error("Error saving CV data to Redis:", error);
    return { success: false, error: "Failed to save data" };
  }
}
