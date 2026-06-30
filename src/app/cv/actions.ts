"use server";

import redis from "@/app/lib/redis";
import { CVData, defaultCVData } from "@/types/cv";
import { cookies } from "next/headers";

const CV_REDIS_KEY = "cv:data";

export async function getCVData(): Promise<CVData> {
  try {
    const data = await redis.get<CVData>(CV_REDIS_KEY);
    if (!data) {
      return defaultCVData;
    }
    return data;
  } catch (error) {
    console.error("Error fetching CV data from Redis:", error);
    return defaultCVData;
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
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  });
  
  return true;
}

export async function saveCVData(data: CVData): Promise<{ success: boolean; error?: string }> {
  const expectedSecret = process.env.CV_EDIT_SECRET || process.env.ADMIN_API_KEY;
  const sessionCookie = cookies().get("admin_session");
  
  if (!expectedSecret || sessionCookie?.value !== expectedSecret) {
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
