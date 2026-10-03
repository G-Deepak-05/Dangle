export const IS_MAC = typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent);

export const KEYS = IS_MAC
  ? { toggle: "⌘ ⌥ D", settings: "⌘ ⌥ ,", reel: "⌥ drag", reelHint: "Hold ⌥ Option" }
  : { toggle: "Ctrl Alt D", settings: "Ctrl Alt ,", reel: "Alt + drag", reelHint: "Hold Alt" };

/** The same shortcuts split into individual keys, for drawing keycaps. */
export const KEYCAPS = IS_MAC
  ? { toggle: ["⌘", "⌥", "D"], settings: ["⌘", "⌥", ","], reel: ["⌥", "drag"] }
  : { toggle: ["Ctrl", "Alt", "D"], settings: ["Ctrl", "Alt", ","], reel: ["Alt", "drag"] };

/** "this Mac" or "this PC", for privacy copy. */
export const THIS_DEVICE = IS_MAC ? "this Mac" : "this PC";
