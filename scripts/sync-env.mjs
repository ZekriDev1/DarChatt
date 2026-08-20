// =============================================================
// Dar Chatt — Sync .env values into js/supabase-config.js
//
// Usage (from the project root):
//   node scripts/sync-env.mjs
//
// Reads SUPABASE_URL and SUPABASE_ANON_KEY from .env and
// regenerates the shared browser config file at js/supabase-config.js.
// The .env file itself is never served to the browser (see .gitignore).
// =============================================================

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
const configPath = path.join(root, "js", "supabase-config.js");

function parseEnv(content) {
    const values = {};

    content.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;

        const eq = trimmed.indexOf("=");
        if (eq === -1) return;

        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();

        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        values[key] = value;
    });

    return values;
}

function generateConfig(env) {
    const url = env.SUPABASE_URL || "https://YOUR-PROJECT-REF.supabase.co";
    const anonKey = env.SUPABASE_ANON_KEY || "YOUR-SUPABASE-ANON-KEY";

    return [
        "// =============================================================",
        "// Dar Chatt — Supabase Configuration",
        "// GENERATED FILE — do not edit manually.",
        "// Regenerate with:  node scripts/sync-env.mjs",
        "// =============================================================",
        "",
        "window.DARCHATT_SUPABASE = {",
        `    url: ${JSON.stringify(url)},`,
        `    anonKey: ${JSON.stringify(anonKey)}`,
        "};",
        ""
    ].join("\n");
}

try {
    const envContent = readFileSync(envPath, "utf8");
    const env = parseEnv(envContent);

    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
        console.error(
            "[dar-chatt] .env is missing SUPABASE_URL or SUPABASE_ANON_KEY."
        );
        console.error(
            "[dar-chatt] Fill them in first (see .env.example), then re-run this script."
        );
        process.exit(1);
    }

    writeFileSync(configPath, generateConfig(env), "utf8");
    console.log("[dar-chatt] js/supabase-config.js generated from .env");
} catch (err) {
    console.error("[dar-chatt] Could not read .env file:", err.message);
    console.error(
        "[dar-chatt] Copy .env.example to .env, fill your Supabase values, then re-run."
    );
    process.exit(1);
}