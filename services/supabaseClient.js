const { createClient } = require("@supabase/supabase-js");
const path = require("path");
const fs = require("fs");
const { app } = require("electron");

function carregarEnv() {
  const envPath = path.join(app.getAppPath(), ".env");
  const conteudo = fs.readFileSync(envPath, "utf8");
  const env = {};
  for (const linha of conteudo.split("\n")) {
    const trimmed = linha.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([^=]+)=\s*(.+)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  }
  return env;
}

const env = carregarEnv();

const supabaseUrl = env.SUPABASE_URL || "https://wpdgftyaoeflfdsfnncg.supabase.co";
const supabaseAnonKey = env.SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  throw new Error("SUPABASE_ANON_KEY não encontrada no .env");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
  },
});

module.exports = supabase;
