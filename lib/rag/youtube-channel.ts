// Requires a separate (free) YouTube Data API v3 key — NOT the Gemini key.
// Get one at console.cloud.google.com → enable "YouTube Data API v3" →
// Credentials → Create API Key. Free quota is 10,000 units/day; listing a
// channel's uploads costs ~1-3 units per page of ~50 videos, so this is
// essentially free at the volume this product needs.
const YT_API_KEY = process.env.YOUTUBE_DATA_API_KEY;
const YT_API_BASE = "https://www.googleapis.com/youtube/v3";

async function resolveChannelId(handleOrId: string): Promise<string> {
  // Accepts a channel ID directly (starts with "UC"), or a @handle.
  if (handleOrId.startsWith("UC")) return handleOrId;

  const handle = handleOrId.replace(/^@/, "");
  const res = await fetch(
    `${YT_API_BASE}/channels?part=id&forHandle=${handle}&key=${YT_API_KEY}`,
  );
  const data = await res.json();
  const channelId = data.items?.[0]?.id;
  if (!channelId) {
    throw new Error(`Could not resolve channel handle "${handleOrId}" to a channel ID.`);
  }
  return channelId;
}

/**
 * Returns every video URL from a channel's uploads, newest first, up to
 * `maxVideos`. Pass a channel ID (starts with "UC...") or a @handle.
 */
export async function fetchChannelVideoUrls(
  handleOrId: string,
  maxVideos: number = 100,
): Promise<string[]> {
  if (!YT_API_KEY) {
    throw new Error("YOUTUBE_DATA_API_KEY is not set — required for channel-level ingestion.");
  }

  const channelId = await resolveChannelId(handleOrId);

  // Every channel has an "uploads" playlist with a predictable ID: swap the
  // "UC" prefix for "UU" — this avoids a separate API call to look it up.
  const uploadsPlaylistId = "UU" + channelId.slice(2);

  const videoUrls: string[] = [];
  let pageToken: string | undefined;

  while (videoUrls.length < maxVideos) {
    const url = new URL(`${YT_API_BASE}/playlistItems`);
    url.searchParams.set("part", "contentDetails");
    url.searchParams.set("playlistId", uploadsPlaylistId);
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", YT_API_KEY);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString());
    const data = await res.json();

    if (data.error) {
      throw new Error(`YouTube API error: ${data.error.message}`);
    }

    for (const item of data.items ?? []) {
      const videoId = item.contentDetails?.videoId;
      if (videoId) videoUrls.push(`https://www.youtube.com/watch?v=${videoId}`);
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  return videoUrls.slice(0, maxVideos);
}