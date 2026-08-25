import fs from "node:fs";
import path from "node:path";
import { eq, like } from "drizzle-orm";
import { uploadImageToCloudinary } from "../src/config/cloudinary.js";
import { db, pool } from "../src/config/database.js";
import { menuItems } from "../src/db/schema/index.js";

async function uploadToCloudinary(filePath: string, restaurantId: string) {
  const buffer = await fs.promises.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const type = ext === ".webp" ? "image/webp" : ext === ".png" ? "image/png" : "image/jpeg";
  const file = new File([buffer], path.basename(filePath), { type });
  return uploadImageToCloudinary({
    file,
    folder: `restaurant-pos/menu/${restaurantId}`,
    restaurantId,
    requestId: "local-menu-image-migration",
  });
}

async function main() {
  const rows = await db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      restaurantId: menuItems.restaurantId,
      imageUrl: menuItems.imageUrl,
    })
    .from(menuItems)
    .where(like(menuItems.imageUrl, "/uploads/menu/%"));

  let migrated = 0;
  let missingFiles = 0;
  for (const row of rows) {
    if (!row.imageUrl) continue;
    const localPath = path.join(process.cwd(), "public", row.imageUrl);
    if (!fs.existsSync(localPath)) {
      missingFiles += 1;
      console.warn(`Missing local image file for menu item "${row.name}".`);
      continue;
    }

    const uploaded = await uploadToCloudinary(localPath, row.restaurantId);
    await db
      .update(menuItems)
      .set({
        imageUrl: uploaded.imageUrl,
        imagePublicId: uploaded.imagePublicId,
        updatedAt: new Date(),
      })
      .where(eq(menuItems.id, row.id));
    migrated += 1;
    console.log(`Migrated menu item "${row.name}" to Cloudinary.`);
  }

  console.log(`Migration complete. Migrated: ${migrated}. Missing files: ${missingFiles}.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
