import { createClient } from "@supabase/supabase-js";

// Supabase credentials placeholder. Can be overridden by env variables.
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholderanonkey";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
