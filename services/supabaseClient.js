const { createClient } = require("@supabase/supabase-js");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const supabaseUrl = process.env.SUPABASE_URL || "https://wpdgftyaoeflfdsfnncg.supabase.co";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

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
