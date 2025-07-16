export function appendUTMParams(
  url: string,
  params: Record<string, string>
): string {
  try {
    const urlObj = new URL(url);
    for (const [key, value] of Object.entries(params)) {
      urlObj.searchParams.set(key, value);
    }
    return urlObj.toString();
  } catch {
    // fallback if invalid URL
    return url;
  }
}
