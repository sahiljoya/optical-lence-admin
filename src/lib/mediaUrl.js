// Tells whether a link is an image or a video. Same rules as the backend
// (serviceMarketingMedia.getUrlKind), so the form stops a wrong link before saving.

const IMAGE_EXT = ["jpg", "jpeg", "png", "webp", "gif", "avif", "svg", "bmp", "heic", "heif"];
const VIDEO_EXT = ["mp4", "webm", "mov", "m4v", "mkv", "avi", "ogv", "m3u8", "3gp"];
const VIDEO_HOSTS = ["youtube.com", "youtu.be", "vimeo.com"];

// Returns "image", "video", "unknown" or "invalid".
export function getUrlKind(url) {
  let parsed;
  try {
    parsed = new URL(String(url || "").trim());
  } catch {
    return "invalid";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "invalid";
  const host = parsed.hostname.toLowerCase().replace(/^www\.|^m\./, "");
  if (VIDEO_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return "video";
  const path = parsed.pathname.toLowerCase();
  if (path.includes("/video/upload/")) return "video";
  if (path.includes("/image/upload/")) return "image";
  const ext = path.split(".").pop() || "";
  if (VIDEO_EXT.includes(ext)) return "video";
  if (IMAGE_EXT.includes(ext)) return "image";
  return "unknown";
}

// The kind of link each media type holds.
export const KIND_OF_TYPE = { poster: "image", video: "video" };
