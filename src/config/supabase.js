import { createClient } from "@supabase/supabase-js";

// Lazy-load Supabase client to avoid initialization errors at import time
let _supabase = null;

function createSupabaseClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
        console.log("SUPABASE_URL:", supabaseUrl ? "set" : "NOT SET");
        console.log("SUPABASE_SERVICE_ROLE_KEY:", supabaseKey ? "set" : "NOT SET");
    }
    
    return createClient(
        supabaseUrl || "https://placeholder.supabase.co",
        supabaseKey || "placeholder"
    );
}

// Export a proxy that lazy-loads the client
export const supabase = new Proxy({}, {
    get(target, prop) {
        if (!_supabase) {
            _supabase = createSupabaseClient();
        }
        return _supabase[prop];
    }
});
