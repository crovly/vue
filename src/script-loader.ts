const SCRIPT_ID = "crovly-widget-script";
const CDN_URL = "https://get.crovly.com/widget.js";

let loadPromise: Promise<void> | null = null;

/**
 * Loads the Crovly widget script from the CDN exactly once.
 * Subsequent calls return the same promise.
 */
export function loadCrovlyScript(): Promise<void> {
  // Already loaded
  if (typeof window !== "undefined" && window.Crovly) {
    return Promise.resolve();
  }

  // Already loading
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("CrovlyCaptcha requires a browser environment"));
      return;
    }

    // Check if script tag already exists
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      // Script tag exists — wait for it to load
      if (window.Crovly) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => {
        loadPromise = null; // Allow retry on next call
        reject(new Error("Failed to load Crovly widget script"));
      });
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = CDN_URL;
    script.async = true;

    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => {
      loadPromise = null; // Allow retry on next call
      reject(new Error("Failed to load Crovly widget script"));
    });

    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Resolves the Crovly global namespace.
 * The IIFE build sets window.Crovly. The convenience API lives at:
 *   - window.Crovly.default  (default export)
 *   - window.Crovly.Crovly   (named export)
 *   - window.Crovly          (render/reset/etc are also top-level)
 */
export function getCrovlyGlobal() {
  const g = window.Crovly;
  if (!g) return null;

  // Prefer the default export (has render, reset, getResponse, remove)
  if (g.default && typeof g.default.render === "function") return g.default;
  // Fallback to named Crovly export
  if (g.Crovly && typeof g.Crovly.render === "function") return g.Crovly;
  // Top-level (render is directly on window.Crovly)
  if (typeof g.render === "function") return g;

  return null;
}
