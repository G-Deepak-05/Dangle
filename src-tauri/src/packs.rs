//! `.danglepack` files: a user collection bundled as JSON so people can share their own
//! charms with each other. Everything inside is treated as untrusted on import.

use crate::custom_charms::{self, AnchorOffset, NewCustomCharm};
use crate::settings::{RopeStyle, UserCollection};
use serde::{Deserialize, Serialize};
use std::path::Path;

pub const FORMAT: &str = "dangle-pack";
const MAX_PACK_BYTES: u64 = 60 * 1024 * 1024;
const MAX_PACK_CHARMS: usize = 100;

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PackCharm {
    pub name: String,
    pub rope_style: RopeStyle,
    pub anchor_offset: AnchorOffset,
    pub default_scale: f64,
    pub png_base64: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Pack {
    pub format: String,
    pub version: u32,
    pub name: String,
    pub charms: Vec<PackCharm>,
    /// Built-in charms are referenced by id rather than copied.
    #[serde(default)]
    pub builtin: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub collection: UserCollection,
    pub imported: usize,
    pub skipped: usize,
}

pub fn build(custom_dir: &Path, collection: &UserCollection) -> Pack {
    let mut charms = Vec::new();
    let mut builtin = Vec::new();
    for id in &collection.charm_ids {
        match custom_charms::get(custom_dir, id) {
            Some(c) => charms.push(PackCharm {
                name: c.meta.name,
                rope_style: c.meta.rope_style,
                anchor_offset: c.meta.anchor_offset,
                default_scale: c.meta.default_scale,
                png_base64: c
                    .image_data_url
                    .trim_start_matches("data:image/png;base64,")
                    .to_string(),
            }),
            None if !id.starts_with("custom-") => builtin.push(id.clone()),
            None => {}
        }
    }
    Pack {
        format: FORMAT.into(),
        version: 1,
        name: collection.name.clone(),
        charms,
        builtin,
    }
}

pub fn read(path: &Path) -> Result<Pack, String> {
    let size = std::fs::metadata(path)
        .map_err(|_| "That file couldn't be opened.".to_string())?
        .len();
    if size > MAX_PACK_BYTES {
        return Err("That pack is too large.".into());
    }
    let bytes = std::fs::read(path).map_err(|_| "That file couldn't be read.".to_string())?;
    let pack: Pack =
        serde_json::from_slice(&bytes).map_err(|_| "That isn't a Dangle pack.".to_string())?;
    if pack.format != FORMAT || pack.version != 1 {
        return Err("That pack was made by a different version of Dangle.".into());
    }
    if pack.charms.len() + pack.builtin.len() > MAX_PACK_CHARMS {
        return Err("That pack has too many charms.".into());
    }
    Ok(pack)
}

/// Saves each charm through the normal custom-charm validation and returns the new ids.
pub fn import(
    custom_dir: &Path,
    pack: Pack,
    known_builtin: impl Fn(&str) -> bool,
) -> (Vec<String>, usize) {
    let mut ids = Vec::new();
    let mut skipped = 0;
    for charm in pack.charms {
        let saved = custom_charms::save(
            custom_dir,
            NewCustomCharm {
                name: charm.name,
                rope_style: charm.rope_style,
                anchor_offset: charm.anchor_offset,
                default_scale: charm.default_scale,
                png_base64: charm.png_base64,
            },
        );
        match saved {
            Ok(c) => ids.push(c.meta.id),
            Err(_) => skipped += 1,
        }
    }
    for id in pack.builtin {
        if known_builtin(&id) {
            ids.push(id);
        } else {
            skipped += 1;
        }
    }
    (ids, skipped)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_foreign_json() {
        let dir = std::env::temp_dir().join(format!("dangle-pack-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("x.danglepack");
        std::fs::write(
            &path,
            r#"{"format":"other","version":1,"name":"x","charms":[]}"#,
        )
        .unwrap();
        assert!(read(&path).is_err());
        std::fs::write(&path, "not json").unwrap();
        assert!(read(&path).is_err());
        std::fs::write(
            &path,
            r#"{"format":"dangle-pack","version":1,"name":"Ok","charms":[],"builtin":["moon"]}"#,
        )
        .unwrap();
        let pack = read(&path).unwrap();
        let (ids, skipped) = import(&dir, pack, |id| id == "moon");
        assert_eq!(ids, vec!["moon".to_string()]);
        assert_eq!(skipped, 0);
    }
}
