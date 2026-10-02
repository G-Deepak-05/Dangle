//! Local storage for user-created charms. Image bytes are untrusted: only PNGs with
//! sane dimensions are accepted, and ids are generated here, never taken from input.

use crate::settings::RopeStyle;
use base64::Engine;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

const MAX_PNG_BYTES: usize = 4 * 1024 * 1024;
const MAX_DIMENSION: u32 = 1024;
const MIN_DIMENSION: u32 = 16;
const MAX_NAME_CHARS: usize = 40;
const MAX_CUSTOM_CHARMS: usize = 200;
const SOUNDS: [&str; 13] = [
    "metal", "bell", "glass", "wood", "soft", "paper", "plastic", "magic", "laser", "retro", "pop",
    "punch", "none",
];

pub fn clean_sound(sound: Option<String>) -> Option<String> {
    sound.filter(|s| SOUNDS.contains(&s.as_str()))
}

const PNG_SIGNATURE: [u8; 8] = [0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A];

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq)]
pub struct AnchorOffset {
    pub x: f64,
    pub y: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomCharmMeta {
    pub id: String,
    pub name: String,
    pub rope_style: RopeStyle,
    pub anchor_offset: AnchorOffset,
    pub default_scale: f64,
    pub created_at: u64,
    #[serde(default)]
    pub sound: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewCustomCharm {
    pub name: String,
    pub rope_style: RopeStyle,
    pub anchor_offset: AnchorOffset,
    pub default_scale: f64,
    pub png_base64: String,
    #[serde(default)]
    pub sound: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomCharm {
    #[serde(flatten)]
    pub meta: CustomCharmMeta,
    pub image_data_url: String,
}

pub fn png_dimensions(bytes: &[u8]) -> Result<(u32, u32), String> {
    if bytes.len() < 24 || bytes[..8] != PNG_SIGNATURE || &bytes[12..16] != b"IHDR" {
        return Err("Not a valid PNG image.".into());
    }
    let w = u32::from_be_bytes(bytes[16..20].try_into().unwrap());
    let h = u32::from_be_bytes(bytes[20..24].try_into().unwrap());
    Ok((w, h))
}

pub fn validate_png(bytes: &[u8]) -> Result<(), String> {
    if bytes.len() > MAX_PNG_BYTES {
        return Err("Image is too large.".into());
    }
    let (w, h) = png_dimensions(bytes)?;
    if !(MIN_DIMENSION..=MAX_DIMENSION).contains(&w)
        || !(MIN_DIMENSION..=MAX_DIMENSION).contains(&h)
    {
        return Err("Image dimensions are out of range.".into());
    }
    Ok(())
}

pub fn clean_name(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .filter(|c| !c.is_control())
        .take(MAX_NAME_CHARS)
        .collect::<String>()
        .trim()
        .to_string();
    if cleaned.is_empty() {
        "My charm".into()
    } else {
        cleaned
    }
}

fn is_custom_id(id: &str) -> bool {
    id.starts_with("custom-")
        && id.len() <= 48
        && id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
}

fn charm_dir(root: &Path, id: &str) -> Result<PathBuf, String> {
    if !is_custom_id(id) {
        return Err("Invalid charm id.".into());
    }
    Ok(root.join(id))
}

fn now_millis() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn new_id() -> String {
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    format!("custom-{:x}{:04x}", nanos, std::process::id() & 0xffff)
}

fn read_charm(dir: &Path) -> Option<CustomCharm> {
    let meta: CustomCharmMeta =
        serde_json::from_slice(&fs::read(dir.join("charm.json")).ok()?).ok()?;
    if !is_custom_id(&meta.id) {
        return None;
    }
    let bytes = fs::read(dir.join("image.png")).ok()?;
    validate_png(&bytes).ok()?;
    let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
    Some(CustomCharm {
        meta,
        image_data_url: format!("data:image/png;base64,{encoded}"),
    })
}

pub fn list(root: &Path) -> Vec<CustomCharm> {
    let Ok(entries) = fs::read_dir(root) else {
        return Vec::new();
    };
    let mut charms: Vec<CustomCharm> = entries
        .flatten()
        .filter(|e| e.path().is_dir())
        .filter_map(|e| read_charm(&e.path()))
        .collect();
    charms.sort_by_key(|c| c.meta.created_at);
    charms
}

pub fn save(root: &Path, input: NewCustomCharm) -> Result<CustomCharm, String> {
    if list(root).len() >= MAX_CUSTOM_CHARMS {
        return Err("You have reached the custom charm limit.".into());
    }
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(input.png_base64.as_bytes())
        .map_err(|_| "Image data is corrupted.".to_string())?;
    validate_png(&bytes)?;

    let meta = CustomCharmMeta {
        id: new_id(),
        name: clean_name(&input.name),
        rope_style: input.rope_style,
        anchor_offset: AnchorOffset {
            x: input.anchor_offset.x.clamp(0.0, 1.0),
            y: input.anchor_offset.y.clamp(0.0, 1.0),
        },
        default_scale: if input.default_scale.is_finite() {
            input.default_scale.clamp(0.5, 1.6)
        } else {
            1.0
        },
        created_at: now_millis(),
        sound: clean_sound(input.sound),
    };
    let dir = charm_dir(root, &meta.id)?;
    fs::create_dir_all(&dir).map_err(|e| format!("Could not save charm: {e}"))?;
    let write = || -> std::io::Result<()> {
        fs::write(dir.join("image.png"), &bytes)?;
        fs::write(dir.join("charm.json"), serde_json::to_vec_pretty(&meta)?)?;
        Ok(())
    };
    if let Err(e) = write() {
        let _ = fs::remove_dir_all(&dir);
        return Err(format!("Could not save charm: {e}"));
    }
    read_charm(&dir).ok_or_else(|| "Saved charm could not be read back.".into())
}

pub fn get(root: &Path, id: &str) -> Option<CustomCharm> {
    read_charm(&charm_dir(root, id).ok()?)
}

pub fn delete(root: &Path, id: &str) -> Result<(), String> {
    let dir = charm_dir(root, id)?;
    if dir.exists() {
        fs::remove_dir_all(dir).map_err(|e| format!("Could not delete charm: {e}"))?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tiny_png(w: u32, h: u32) -> Vec<u8> {
        let mut v = PNG_SIGNATURE.to_vec();
        v.extend_from_slice(&13u32.to_be_bytes());
        v.extend_from_slice(b"IHDR");
        v.extend_from_slice(&w.to_be_bytes());
        v.extend_from_slice(&h.to_be_bytes());
        v.extend_from_slice(&[8, 6, 0, 0, 0, 0, 0, 0, 0]);
        v
    }

    #[test]
    fn rejects_non_png_and_bad_dimensions() {
        assert!(validate_png(b"GIF89a....................").is_err());
        assert!(validate_png(&tiny_png(4, 4)).is_err());
        assert!(validate_png(&tiny_png(5000, 200)).is_err());
        assert!(validate_png(&tiny_png(256, 256)).is_ok());
    }

    #[test]
    fn rejects_path_traversal_ids() {
        let root = Path::new("/tmp/x");
        assert!(charm_dir(root, "../../etc").is_err());
        assert!(charm_dir(root, "custom-../x").is_err());
        assert!(charm_dir(root, "custom-abc123").is_ok());
    }

    #[test]
    fn cleans_names() {
        assert_eq!(clean_name("  \u{7}Hi\n "), "Hi");
        assert_eq!(clean_name(""), "My charm");
        assert_eq!(clean_name(&"a".repeat(100)).len(), MAX_NAME_CHARS);
    }

    #[test]
    fn save_list_delete_round_trip() {
        let root = std::env::temp_dir().join(format!("dangle-custom-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        let png = tiny_png(64, 64);
        let saved = save(
            &root,
            NewCustomCharm {
                name: "Pebble".into(),
                rope_style: RopeStyle::Cord,
                anchor_offset: AnchorOffset { x: 2.0, y: 0.1 },
                default_scale: 9.0,
                sound: Some("tuba".into()),
                png_base64: base64::engine::general_purpose::STANDARD.encode(&png),
            },
        )
        .unwrap();
        assert_eq!(saved.meta.anchor_offset.x, 1.0);
        assert_eq!(saved.meta.default_scale, 1.6);
        assert_eq!(saved.meta.sound, None);
        assert_eq!(list(&root).len(), 1);
        delete(&root, &saved.meta.id).unwrap();
        assert!(list(&root).is_empty());
    }
}
