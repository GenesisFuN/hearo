#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Define your colors here - SINGLE SOURCE OF TRUTH
const COLORS = {
  background: "#171718ff",
  surface: "#1d1e1fff",
  accent: "#45e1d9ff",
  "text-light": "#ffffffff",
};

// Path to files
const configPath = path.join(__dirname, "../tailwind.config.js");
const cssPath = path.join(__dirname, "../src/styles/globals.css");

function updateTailwindConfig() {
  let configContent = fs.readFileSync(configPath, "utf8");

  // Update individual color values instead of replacing the entire section
  Object.entries(COLORS).forEach(([key, value]) => {
    const quotedKey = key.includes("-") ? `"${key}"` : key;
    const pattern = new RegExp(`(${quotedKey}:\\s*)"[^"]*"`, "g");
    configContent = configContent.replace(pattern, `$1"${value}"`);
  });

  fs.writeFileSync(configPath, configContent);
  console.log("✅ Updated tailwind.config.js");
}

function updateGlobalCSS() {
  let cssContent = fs.readFileSync(cssPath, "utf8");

  // Update individual CSS custom properties
  Object.entries(COLORS).forEach(([key, value]) => {
    const pattern = new RegExp(`(--color-${key}:\\s*)[^;]*;`, "g");
    cssContent = cssContent.replace(pattern, `$1${value};`);
  });

  // Update opacity variations for accent color
  if (COLORS.accent) {
    const accentHex = COLORS.accent.replace("#", "").replace("ff", "");
    const accent80 = `#${accentHex}cc`; // 80% opacity
    cssContent = cssContent.replace(
      /(\.text-accent\\\/80\s*{\s*color:\s*)[^;]*;/g,
      `$1${accent80};`
    );
    cssContent = cssContent.replace(
      /(\.hover\\:text-accent\\\/80:hover\s*{\s*color:\s*)[^;]*;/g,
      `$1${accent80};`
    );
  }

  // Update surface opacity variations
  if (COLORS.surface) {
    const surfaceHex = COLORS.surface.replace("#", "").replace("ff", "");
    const surface90 = `#${surfaceHex}e6`; // 90% opacity
    const surface40 = `#${surfaceHex}66`; // 40% opacity
    cssContent = cssContent.replace(
      /(\.bg-surface\\\/90\s*{\s*background-color:\s*)[^;]*;/g,
      `$1${surface90};`
    );
    cssContent = cssContent.replace(
      /(\.border-surface\\\/40\s*{\s*border-color:\s*)[^;]*;/g,
      `$1${surface40};`
    );
  }

  // Update text-light opacity for footer
  if (COLORS["text-light"]) {
    const textLightHex = COLORS["text-light"]
      .replace("#", "")
      .replace("ff", "");
    const textLight70 = `#${textLightHex}b3`; // 70% opacity
    cssContent = cssContent.replace(
      /(\.text-text-light\\\/70\s*{\s*color:\s*)[^;]*;/g,
      `$1${textLight70};`
    );
  }

  fs.writeFileSync(cssPath, cssContent);
  console.log("✅ Updated globals.css");
}

// Run the sync
console.log("🔄 Syncing colors...");
updateTailwindConfig();
updateGlobalCSS();
console.log("🎉 Colors synced successfully!");
console.log("\nCurrent colors:");
Object.entries(COLORS).forEach(([key, value]) => {
  console.log(`  ${key}: ${value}`);
});
