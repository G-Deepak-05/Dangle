# Dangle

A tiny thing for your desktop. Dangle hangs a small charm on a string from the top of your screen. Grab it, swing it, let go.

This first milestone targets **macOS** (Apple Silicon and Intel). The architecture is ready for Windows; see [Platform notes](#platform-notes).

## Features

- A transparent, frameless charm that sits above your windows. Clicks pass through everywhere except the charm itself.
- Real physics: a Verlet string with a heavy charm, inertia, damping, release velocity, natural settling, and a slack string when the charm is tossed upward.
- A string you can extend. Set its length from 0.5× to 3× in Customize, or hold **⌥ Option** and drag the charm to reel string in or out.
- 30 original charms, with search, categories, and favorites.
- Customization: charm size, string style (Minimal, Thread, Cord, Chain), 8 string colors, beads (Pearls, Wood, Glass, Stars), position, display, and motion (Calm, Normal, Bouncy).
- Custom charms made from PNG, WebP, or JPEG. The image is validated, resized, background-cut, and trimmed entirely on your Mac.
- A menu bar icon, global shortcuts, start at login, all Spaces, hide in full screen, rest when you're away, and reduce motion.
- Multiple monitors. The charm remembers its display and falls back to the primary display if that one is disconnected.
- A short onboarding and a privacy page. No account, no analytics, no network.

## Run it

Requirements: macOS 11+, Node 20+, Rust (stable), and the Xcode command line tools.

```bash
npm install
npm run app:dev        # runs the app with hot reload
```

On first launch, the control window opens with onboarding. After that, Dangle lives in the menu bar.

## Build it

```bash
npm run app:build      # → src-tauri/target/release/bundle/{macos/Dangle.app, dmg/*.dmg}
```

To build a universal binary for Apple Silicon and Intel:

```bash
rustup target add x86_64-apple-darwin aarch64-apple-darwin
npx tauri build --target universal-apple-darwin
```

The build is unsigned. To share it outside your own Mac, sign and notarize it with your Developer ID.

## Test it

```bash
npm test                          # physics, image validation, manifest parsing (Vitest)
cd src-tauri && cargo test        # settings recovery, PNG validation, custom charm storage
npm run typecheck
```

## Keyboard

| Shortcut | Action |
| --- | --- |
| ⌘ ⌥ D | Show or hide the charm (global) |
| ⌘ ⌥ , | Open settings (global) |
| ⌥ + drag | Lengthen or shorten the string |
| ⌘ F | Search charms (in the library) |
| ⌘ + / ⌘ − / ⌘ 0 | Scale the interface |
| Esc | Go back |

`Dangle --open library|customize|create|settings|privacy` opens the running app on that screen.

## Architecture

```
charms/<id>/            built-in charms: charm.svg + charm.json (discovered at build time)
src/physics/            framework-free simulation (Verlet string, charm body, profiles)
src/render/             canvas drawing: sprites, string styles, beads, scene
src/engine/stage.ts     one charm on one canvas: loop, input, reeling, sleep, breeze
src/overlay/            the desktop charm window (plain TS, no React)
src/app/                the control window (React): views + components
src/imaging/            local image validation, background removal, trimming
src/state/              settings/charm stores synced with Rust over events
src/ipc/                typed wrappers for Tauri commands and events
src-tauri/src/
  settings.rs           schema, lenient parsing, corruption recovery, atomic saves
  overlay.rs            overlay window, layout per display, cursor hit-testing thread
  platform.rs           macOS-only pieces (cursor, Spaces, idle time, focus return)
  custom_charms.rs      sandboxed storage for user charms (PNG re-validated)
  tray.rs, shortcuts.rs, control.rs, displays.rs, commands.rs
```

**How click-through works.** The overlay window ignores the mouse by default. A small Rust thread polls the cursor (about 20 Hz, rising to 80 Hz near the charm) and tests it against the hit circle the charm reports. The window accepts the mouse only while the cursor is over the charm. When you let go, focus returns to the app you were using.

**Why it stays light.** The physics runs at a fixed 120 Hz step, but only while something moves. Once the charm settles, the render loop stops entirely. Every 6–14 seconds a tiny random breeze wakes it for a few seconds, so it never looks frozen. Charm art is rasterized once per size, and physics state lives outside React.

**Adding a charm.** Create `charms/<id>/charm.svg` and `charm.json`:

```json
{
  "id": "comet",
  "name": "Comet",
  "category": "space",
  "tags": ["retro"],
  "defaultScale": 1,
  "ropeStyle": "thread",
  "anchorOffset": { "x": 0.5, "y": 0.05 },
  "physicsProfile": { "charmMass": 12 },
  "metadata": { "description": "Just passing through.", "author": "You" }
}
```

`anchorOffset` is where the string attaches, as a fraction of the artwork box. You don't need to touch the physics engine. The built-in set is generated by `design/make_charms.py`.

## Data and privacy

Everything is stored locally:

- Settings: `~/Library/Application Support/app.dangle.desktop/settings.json`. A corrupted file is moved aside and defaults are used.
- Custom charms: `~/Library/Application Support/app.dangle.desktop/custom-charms/<id>/`.

Dangle makes no network requests.

## Platform notes

Windows support mostly means filling in `src-tauri/src/platform.rs`:

- Cursor position: `GetCursorPos`.
- Idle time: `GetLastInputInfo`.
- Focus return: `SetForegroundWindow`.
- Tray: Tauri already maps the menu bar icon to the system tray.

Everything else is shared.
