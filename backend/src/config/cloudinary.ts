import { createHash } from "node:crypto";
import { AppError } from "../common/errors/app-error.js";
import { logger } from "../common/logger/logger.js";
import { env } from "./env.js";

type CloudinaryUploadResponse = {
  secure_url?: string;
  public_id?: string;
  error?: { message?: string };
};

type CloudinaryDestroyResponse = {
  result?: string;
  error?: { message?: string };
};

function hasCloudinaryConfig() {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

function sign(params: Record<string, string>) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(`${payload}${env.CLOUDINARY_API_SECRET}`).digest("hex");
}

function assertCloudinaryConfig() {
  if (hasCloudinaryConfig()) return;
  throw new AppError(
    "Cloudinary configuration is missing",
    500,
    "CLOUDINARY_CONFIG_MISSING",
    {
      cloudName: Boolean(env.CLOUDINARY_CLOUD_NAME),
      apiKey: Boolean(env.CLOUDINARY_API_KEY),
      apiSecret: Boolean(env.CLOUDINARY_API_SECRET),
    },
    "Cloudinary image upload is not configured.",
  );
}

async function parseCloudinaryResponse(response: Response) {
  try {
    return await response.json() as CloudinaryUploadResponse;
  } catch {
    return {} as CloudinaryUploadResponse;
  }
}

export async function uploadImageToCloudinary(input: {
  file: File;
  folder: string;
  restaurantId: string;
  requestId?: string;
}) {
  assertCloudinaryConfig();

  const arrayBuffer = await input.file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = sign({ folder: input.folder, timestamp });
  const form = new FormData();
  const mimeType = input.file.type || "application/octet-stream";
  form.set("file", `data:${mimeType};base64,${buffer.toString("base64")}`);
  form.set("api_key", env.CLOUDINARY_API_KEY!);
  form.set("timestamp", timestamp);
  form.set("folder", input.folder);
  form.set("signature", signature);

  logger.info(
    {
      requestId: input.requestId,
      restaurantId: input.restaurantId,
      fileName: input.file.name,
      fileType: mimeType,
      fileSize: input.file.size,
      folder: input.folder,
    },
    "Cloudinary menu image upload started",
  );

  const response = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: form,
  });
  const payload = await parseCloudinaryResponse(response);

  if (!response.ok) {
    const cloudinaryMessage = payload.error?.message ?? `HTTP ${response.status}`;
    logger.warn(
      {
        requestId: input.requestId,
        restaurantId: input.restaurantId,
        status: response.status,
        cloudinaryMessage,
        folder: input.folder,
      },
      "Cloudinary menu image upload failed",
    );
    const authLikeMessage = /api key|signature|authentication|authorization|credentials/i.test(cloudinaryMessage);
    const code = response.status === 401 || response.status === 403 || authLikeMessage ? "CLOUDINARY_AUTH_FAILED" : "CLOUDINARY_UPLOAD_FAILED";
    throw new AppError(
      `Cloudinary upload failed: ${cloudinaryMessage}`,
      code === "CLOUDINARY_AUTH_FAILED" ? 502 : 502,
      code,
      { status: response.status },
      code === "CLOUDINARY_AUTH_FAILED" ? "Cloudinary rejected the upload credentials." : "Cloudinary upload failed.",
    );
  }

  if (!payload.secure_url || !payload.public_id) {
    logger.warn(
      {
        requestId: input.requestId,
        restaurantId: input.restaurantId,
        hasSecureUrl: Boolean(payload.secure_url),
        hasPublicId: Boolean(payload.public_id),
      },
      "Cloudinary upload response missing required fields",
    );
    throw new AppError("Cloudinary upload response missing secure_url or public_id", 502, "CLOUDINARY_UPLOAD_FAILED", undefined, "Cloudinary upload failed.");
  }

  logger.info(
    {
      requestId: input.requestId,
      restaurantId: input.restaurantId,
      publicId: payload.public_id,
    },
    "Cloudinary menu image upload completed",
  );

  return { imageUrl: payload.secure_url, imagePublicId: payload.public_id };
}

export async function deleteImageFromCloudinary(publicId: string) {
  assertCloudinaryConfig();

  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = sign({ public_id: publicId, timestamp });
  const form = new FormData();
  form.set("public_id", publicId);
  form.set("api_key", env.CLOUDINARY_API_KEY!);
  form.set("timestamp", timestamp);
  form.set("signature", signature);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/destroy`, { method: "POST", body: form });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as CloudinaryDestroyResponse;
    logger.warn(
      { status: response.status, publicId, cloudinaryMessage: payload.error?.message },
      "Cloudinary image delete failed",
    );
  }
}
