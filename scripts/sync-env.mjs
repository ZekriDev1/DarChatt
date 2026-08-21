// =============================================================
// Dar Chatt — Sync .env values into js/supabase-config.js
//
// Usage (from the project root):
//   node scripts/sync-env.mjs
//
// Reads SUPABASE_URL and SUPABASE_ANON_KEY from .env and
// regenerates the shared browser config files:
//   js/supabase-config.js  — Supabase client settings
//   js/ai-config.js        — Google AI (Gemini) settings for the assistant
// The .env file itself is never served to the browser (see .gitignore).
//
// On Netlify / CI the environment variables are injected via
// process.env, so the .env file is optional there.
// =============================================================

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
const configPath = path.join(root, "js", "supabase-config.js");
const aiConfigPath = path.join(root, "js", "ai-config.js");

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

function generateAiConfig(env) {
    const apiKey = env.GOOGLE_AI_API_KEY || "YOUR-GOOGLE-AI-API-KEY";
    const model = env.GOOGLE_AI_MODEL || "gemini-2.5-flash";

    return [
        "// =============================================================",
        "// Dar Chatt — Google AI (Gemini) Configuration",
        "// GENERATED FILE — do not edit manually.",
        "// Regenerate with:  node scripts/sync-env.mjs",
        "// =============================================================",
        "",
        "window.DARCHATT_AI = {",
        `    apiKey: ${JSON.stringify(apiKey)},`,
        `    model: ${JSON.stringify(model)}`,
        "};",
        ""
    ].join("\n");
}

// -----------------------------------------------------------------
// Merge sources: .env file (if it exists) + process.env
// process.env takes priority so Netlify / CI env vars always win.
// -----------------------------------------------------------------
let fileEnv = {};

if (existsSync(envPath)) {
    fileEnv = parseEnv(readFileSync(envPath, "utf8"));
    console.log("[dar-chatt] Loaded .env file");
} else {
    console.log("[dar-chatt] No .env file found — using process.env only");
}

const KEYS = [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "GOOGLE_AI_API_KEY",
    "GOOGLE_AI_MODEL"
];

const env = {};
for (const key of KEYS) {
    env[key] = process.env[key] || fileEnv[key] || "";
}

if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    console.error(
        "[dar-chatt] Missing SUPABASE_URL or SUPABASE_ANON_KEY."
    );
    console.error(
        "[dar-chatt] Set them in .env (local) or as environment variables (Netlify)."
    );
    process.exit(1);
}

writeFileSync(configPath, generateConfig(env), "utf8");
writeFileSync(aiConfigPath, generateAiConfig(env), "utf8");
console.log("[dar-chatt] js/supabase-config.js generated ✓");
console.log("[dar-chatt] js/ai-config.js generated ✓");