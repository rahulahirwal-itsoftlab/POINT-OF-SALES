import fs from "fs";
import path from "path";
import pg from "pg";
const { Client } = pg;

const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf8");
  envConfig.split("\n").forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1]] = match[2].trim();
    }
  });
}

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log("Connected to DB.");

  const dropSchema = `
    DROP SCHEMA public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO public;
  `;
  await client.query(dropSchema);
  console.log("Schema public dropped and recreated.");
  await client.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
