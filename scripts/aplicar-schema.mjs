import { readFileSync } from "fs";
import pg from "pg";

const { Client } = pg;

const PROJECT_REF = "wpdgftyaoeflfdsfnncg";
const DB_PASSWORD = "LZGStdKBygR6NMrqA5A5TA_sPVOe2Hq";

const sql = readFileSync("schema.sql", "utf8");

const client = new Client({
  connectionString: `postgresql://postgres:${encodeURIComponent(DB_PASSWORD)}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("Conectado! Aplicando schema...");
  await client.query(sql);
  console.log("Schema aplicado com sucesso!");
} catch (err) {
  console.error("Erro:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
