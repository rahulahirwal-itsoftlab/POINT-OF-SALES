import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { AppError } from "../errors/app-error.js";
import { logger } from "../logger/logger.js";
import { env } from "../../config/env.js";
import { uploadImageToCloudinary } from "../../config/cloudinary.js";

function hasCloudinaryConfig() {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

export type UploadResult = {
  imageUrl: string;
  imagePublicId?: string;
};

export async function uploadImageFile(input: {
  file: File;
  folder: string;
  restaurantId?: string;
  requestId?: string;
}): Promise<UploadResult> {
  const allowedTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
  if (!allowedTypes.has(input.file.type)) {
    throw new AppError(
      `Invalid image type: ${input.file.type || "unknown"}`,
      422,
      "INVALID_IMAGE",
      { allowedTypes: Array.from(allowedTypes) },
      "Only JPG, PNG, and WEBP images are allowed.",
    );
  }

  if (input.file.size <= 0) {
    throw new AppError("Image file is empty", 422, "INVALID_IMAGE", undefined, "Image file is empty.");
  }

  const maxBytes = 5 * 1024 * 1024; // 5 MB
  if (input.file.size > maxBytes) {
    throw new AppError(
      "Image file is too large",
      413,
      "IMAGE_TOO_LARGE",
      { maxBytes },
      "Image size must be less than 5 MB.",
    );
  }

  if (hasCloudinaryConfig()) {
    return uploadImageToCloudinary({
      file: input.file,
      folder: input.folder,
      restaurantId: input.restaurantId ?? "system",
      requestId: input.requestId,
    });
  }

  // Local filesystem storage fallback
  try {
    const arrayBuffer = await input.file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = input.file.type.split("/")[1] || "png";
    const filename = `img_${Date.now()}_${randomBytes(4).toString("hex")}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", input.folder);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);

    const imageUrl = `/uploads/${input.folder}/${filename}`;
    const imagePublicId = `local_${input.folder}_${filename}`;

    logger.info(
      {
        requestId: input.requestId,
        folder: input.folder,
        filename,
        imageUrl,
      },
      "Saved image to local storage fallback",
    );

    return { imageUrl, imagePublicId };
  } catch (error) {
    logger.error({ error, requestId: input.requestId }, "Failed to save local image");
    throw new AppError(
      "Unable to save uploaded image",
      500,
      "IMAGE_SAVE_FAILED",
      undefined,
      "Image upload failed.",
    );
  }
}
