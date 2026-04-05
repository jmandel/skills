/**
 * OpenRouter API client for Gemini image generation.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-3-pro-image-preview";

interface ImageGenOptions {
  prompt: string;
  referenceImage?: string; // base64 data URI of an exemplar image
  aspectRatio?: string;
}

interface ImageGenResult {
  image: Buffer;       // raw PNG/JPEG bytes
  mimeType: string;
  textResponse: string;
}

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY not set. Check your .env file.");
  return key;
}

export async function generateImage(opts: ImageGenOptions): Promise<ImageGenResult> {
  const apiKey = getApiKey();

  // Build message content
  const contentParts: any[] = [];

  if (opts.referenceImage) {
    contentParts.push({
      type: "text",
      text: "Here is an example of a previously generated slide that successfully follows the visual system. Match this style closely:",
    });
    contentParts.push({
      type: "image_url",
      image_url: { url: opts.referenceImage },
    });
    contentParts.push({
      type: "text",
      text: "Now generate the following slide in the same visual style:\n\n" + opts.prompt,
    });
  } else {
    contentParts.push({
      type: "text",
      text: opts.prompt,
    });
  }

  const body = {
    model: MODEL,
    messages: [
      {
        role: "user" as const,
        content: contentParts,
      },
    ],
    modalities: ["image", "text"],
    image_config: {
      aspect_ratio: opts.aspectRatio || "16:9",
    },
  };

  console.log(`  Calling OpenRouter (${MODEL})...`);
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/smart-permission-tickets",
      "X-Title": "Deck Image Generator",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter API error ${res.status}: ${errText}`);
  }

  const data = await res.json() as any;
  return extractImage(data);
}

function extractImage(data: any): ImageGenResult {
  const choice = data.choices?.[0];
  if (!choice) throw new Error("No choices in response: " + JSON.stringify(data));

  const message = choice.message;
  let textResponse = "";
  let imageDataUri: string | null = null;

  // Format 1: message.content is a string, images in message.images[]
  if (typeof message.content === "string") {
    textResponse = message.content;
  }
  if (message.images?.length) {
    imageDataUri = message.images[0].image_url?.url;
  }

  // Format 2: message.content is an array of parts
  if (Array.isArray(message.content)) {
    for (const part of message.content) {
      if (part.type === "text") {
        textResponse += part.text;
      } else if (part.type === "image_url") {
        imageDataUri = part.image_url?.url;
      }
    }
  }

  // Format 3: inline_data (Gemini native format)
  if (!imageDataUri && Array.isArray(message.content)) {
    for (const part of message.content) {
      if (part.inline_data?.data) {
        const mime = part.inline_data.mime_type || "image/png";
        imageDataUri = `data:${mime};base64,${part.inline_data.data}`;
      }
    }
  }

  if (!imageDataUri) {
    throw new Error(
      "No image found in response. Full response:\n" +
        JSON.stringify(data, null, 2).slice(0, 2000)
    );
  }

  // Parse data URI
  const match = imageDataUri.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image data URI format");

  const mimeType = match[1];
  const imageBuffer = Buffer.from(match[2], "base64");

  return { image: imageBuffer, mimeType, textResponse };
}

/** Load an image file as a base64 data URI */
export async function imageToDataUri(path: string): Promise<string> {
  const file = Bun.file(path);
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const ext = path.split(".").pop()?.toLowerCase();
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${base64}`;
}
