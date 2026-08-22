import { handleUpload } from "@vercel/blob/client";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    res.status(501).json({ error: "Blob is not configured." });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!String(pathname).startsWith("groups/")) {
          throw new Error("Uploads must stay under a group.");
        }
        return {
          addRandomSuffix: false,
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "image/heic",
            "image/heif",
            "video/mp4",
            "video/quicktime",
            "video/webm",
            "application/octet-stream",
          ],
          maximumSizeInBytes: 80 * 1024 * 1024,
        };
      },
    });
    res.status(200).json(jsonResponse);
  } catch (error) {
    res.status(400).json({ error: error.message || "Upload token failed" });
  }
}
