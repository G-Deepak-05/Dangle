use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

pub const SETTINGS_VERSION: u32 = 1;
pub const DEFAULT_ANCHOR_X: f64 = 0.78;
pub const DEFAULT_CHARM_ID: &str = "moon";
pub const MIN_THREAD_LENGTH: f64 = 0.5;
pub const MAX_THREAD_LENGTH: f64 = 3.0;
const MAX_FAVORITES: usize = 500;
const MAX_ID_LEN: usize = 64;
pub const MAX_EXTRA_SLOTS: usize = 2;
const MAX_COLLECTIONS: usize = 50;
const MAX_COLLECTION_CHARMS: usize = 200;
const MAX_NAME_CHARS: usize = 40;

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum CharmSize {
    Small,
    Medium,
    Large,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RopeStyle {
    Minimal,
    Thread,
    Cord,
    Chain,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ThreadColor {
    Classic,
    Ink,
    Cream,
    Rose,
    Sky,
    Sage,
    Gold,
    Silver,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Beads {
    None,
    Pearl,
    Wood,
    Glass,
    Star,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Finish {
    Classic,
    Glossy,
    Matte,
    Sticker,
    Glow,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Hook {
    Clip,
    Pin,
    Bow,
    Suction,
    Nail,
    None,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RotateMode {
    Off,
    Hourly,
    Daily,
}

/// An additional charm hanging on its own string.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CharmSlot {
    pub charm_id: String,
    pub anchor_x: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct UserCollection {
    pub id: String,
    pub name: String,
    pub charm_ids: Vec<String>,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum PhysicsProfile {
    Calm,
    Normal,
    Bouncy,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub version: u32,
    pub onboarding_complete: bool,
    pub active_charm_id: String,
    pub size: CharmSize,
    pub physics: PhysicsProfile,
    pub rope_by_charm: BTreeMap<String, RopeStyle>,
    /// String length as a multiple of the size preset's default.
    pub thread_length: f64,
    pub thread_color: ThreadColor,
    pub beads: Beads,
    pub anchor_x: f64,
    pub display_id: Option<String>,
    pub favorites: Vec<String>,
    pub start_at_login: bool,
    pub always_on_top: bool,
    pub all_spaces: bool,
    pub remember_position: bool,
    pub hide_when_fullscreen: bool,
    pub pause_when_inactive: bool,
    pub reduce_motion: bool,
    pub paused: bool,
    pub hidden: bool,
    pub debug_overlay: bool,
    pub check_for_updates: bool,
    pub extra_slots: Vec<CharmSlot>,
    pub finish: Finish,
    pub shadow: bool,
    pub hook: Hook,
    pub rotate: RotateMode,
    /// "favorites", "all", or "collection:<id>".
    pub rotate_source: String,
    pub user_collections: Vec<UserCollection>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            version: SETTINGS_VERSION,
            onboarding_complete: false,
            active_charm_id: DEFAULT_CHARM_ID.into(),
            size: CharmSize::Medium,
            physics: PhysicsProfile::Normal,
            rope_by_charm: BTreeMap::new(),
            thread_length: 1.0,
            thread_color: ThreadColor::Classic,
            beads: Beads::None,
            anchor_x: DEFAULT_ANCHOR_X,
            display_id: None,
            favorites: Vec::new(),
            start_at_login: false,
            always_on_top: true,
            all_spaces: true,
            remember_position: true,
            hide_when_fullscreen: true,
            pause_when_inactive: true,
            reduce_motion: false,
            paused: false,
            hidden: false,
            debug_overlay: false,
            check_for_updates: true,
            extra_slots: Vec::new(),
            finish: Finish::Classic,
            shadow: true,
            hook: Hook::Clip,
            rotate: RotateMode::Off,
            rotate_source: "favorites".into(),
            user_collections: Vec::new(),
        }
    }
}

fn valid_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= MAX_ID_LEN
        && id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

impl Settings {
    /// Applies each known key independently so one bad field never wipes the rest.
    pub fn merged_lenient(base: &Settings, patch: &Value) -> Settings {
        let mut current = serde_json::to_value(base).expect("settings serialize");
        if let Some(patch) = patch.as_object() {
            for (key, val) in patch {
                if current.get(key).is_none() {
                    continue;
                }
                let mut candidate = current.clone();
                candidate[key] = val.clone();
                if serde_json::from_value::<Settings>(candidate.clone()).is_ok() {
                    current = candidate;
                }
            }
        }
        let mut merged: Settings = serde_json::from_value(current).unwrap_or_default();
        merged.sanitize();
        merged
    }

    pub fn sanitize(&mut self) {
        self.version = SETTINGS_VERSION;
        if !self.anchor_x.is_finite() {
            self.anchor_x = DEFAULT_ANCHOR_X;
        }
        self.anchor_x = self.anchor_x.clamp(0.0, 1.0);
        if !self.thread_length.is_finite() {
            self.thread_length = 1.0;
        }
        self.thread_length = self
            .thread_length
            .clamp(MIN_THREAD_LENGTH, MAX_THREAD_LENGTH);
        if !valid_id(&self.active_charm_id) {
            self.active_charm_id = DEFAULT_CHARM_ID.into();
        }
        let mut seen = std::collections::HashSet::new();
        self.favorites
            .retain(|id| valid_id(id) && seen.insert(id.clone()));
        self.favorites.truncate(MAX_FAVORITES);
        self.rope_by_charm.retain(|id, _| valid_id(id));

        self.extra_slots.retain(|slot| valid_id(&slot.charm_id));
        self.extra_slots.truncate(MAX_EXTRA_SLOTS);
        for slot in &mut self.extra_slots {
            slot.anchor_x = if slot.anchor_x.is_finite() {
                slot.anchor_x.clamp(0.0, 1.0)
            } else {
                0.5
            };
        }

        let source_ok = self.rotate_source == "favorites"
            || self.rotate_source == "all"
            || self
                .rotate_source
                .strip_prefix("collection:")
                .is_some_and(valid_id);
        if !source_ok {
            self.rotate_source = "favorites".into();
        }

        let mut seen_collections = std::collections::HashSet::new();
        self.user_collections
            .retain(|c| valid_id(&c.id) && seen_collections.insert(c.id.clone()));
        self.user_collections.truncate(MAX_COLLECTIONS);
        for c in &mut self.user_collections {
            let name: String = c
                .name
                .chars()
                .filter(|ch| !ch.is_control())
                .take(MAX_NAME_CHARS)
                .collect();
            c.name = if name.trim().is_empty() {
                "My collection".into()
            } else {
                name.trim().to_string()
            };
            let mut seen = std::collections::HashSet::new();
            c.charm_ids
                .retain(|id| valid_id(id) && seen.insert(id.clone()));
            c.charm_ids.truncate(MAX_COLLECTION_CHARMS);
        }
        if let Some(id) = &self.display_id {
            if id.is_empty() || id.len() > 256 {
                self.display_id = None;
            }
        }
    }
}

pub fn settings_path(config_dir: &Path) -> PathBuf {
    config_dir.join("settings.json")
}

/// Loads settings, recovering from missing or corrupted files without failing.
pub fn load(path: &Path) -> Settings {
    let raw = match fs::read_to_string(path) {
        Ok(raw) => raw,
        Err(_) => return Settings::default(),
    };
    match serde_json::from_str::<Value>(&raw) {
        Ok(value @ Value::Object(_)) => Settings::merged_lenient(&Settings::default(), &value),
        _ => {
            let backup = path.with_extension("corrupt.json");
            let _ = fs::rename(path, backup);
            Settings::default()
        }
    }
}

pub fn save(path: &Path, settings: &Settings) -> std::io::Result<()> {
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir)?;
    }
    let tmp = path.with_extension("json.tmp");
    let body = serde_json::to_vec_pretty(settings).map_err(std::io::Error::other)?;
    fs::write(&tmp, body)?;
    fs::rename(&tmp, path)
}

pub fn patch_from_pairs(pairs: &[(&str, Value)]) -> Value {
    let mut map = Map::new();
    for (k, v) in pairs {
        map.insert((*k).to_string(), v.clone());
    }
    Value::Object(map)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("dangle-test-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn bad_field_does_not_discard_good_fields() {
        let patch = json!({ "size": "gigantic", "physics": "bouncy", "anchorX": 0.2, "beads": "rubies", "threadLength": 9 });
        let s = Settings::merged_lenient(&Settings::default(), &patch);
        assert_eq!(s.size, CharmSize::Medium);
        assert_eq!(s.physics, PhysicsProfile::Bouncy);
        assert_eq!(s.anchor_x, 0.2);
        assert_eq!(s.beads, Beads::None);
        assert_eq!(s.thread_length, MAX_THREAD_LENGTH);
    }

    #[test]
    fn sanitize_clamps_and_filters() {
        let patch = json!({
            "anchorX": 7.0,
            "activeCharmId": "../../etc",
            "favorites": ["moon", "moon", "bad id!", "star"]
        });
        let s = Settings::merged_lenient(&Settings::default(), &patch);
        assert_eq!(s.anchor_x, 1.0);
        assert_eq!(s.active_charm_id, DEFAULT_CHARM_ID);
        assert_eq!(s.favorites, vec!["moon".to_string(), "star".to_string()]);
    }

    #[test]
    fn sanitizes_slots_collections_and_rotation() {
        let patch = json!({
            "extraSlots": [
                { "charmId": "star", "anchorX": 4.0 },
                { "charmId": "../x", "anchorX": 0.2 },
                { "charmId": "cat", "anchorX": 0.1 },
                { "charmId": "ghost", "anchorX": 0.3 }
            ],
            "rotateSource": "collection:../../etc",
            "userCollections": [
                { "id": "uc-1", "name": "  \u{0007}Marvel  ", "charmIds": ["a", "a", "bad id"] },
                { "id": "uc-1", "name": "dupe", "charmIds": [] }
            ],
            "hook": "anchor-chain"
        });
        let s = Settings::merged_lenient(&Settings::default(), &patch);
        assert_eq!(s.extra_slots.len(), 2);
        assert_eq!(s.extra_slots[0].anchor_x, 1.0);
        assert_eq!(s.extra_slots[1].charm_id, "cat");
        assert_eq!(s.rotate_source, "favorites");
        assert_eq!(s.user_collections.len(), 1);
        assert_eq!(s.user_collections[0].name, "Marvel");
        assert_eq!(s.user_collections[0].charm_ids, vec!["a".to_string()]);
        assert_eq!(s.hook, Hook::Clip);
    }

    #[test]
    fn corrupted_file_recovers_with_backup() {
        let dir = temp_dir("corrupt");
        let path = settings_path(&dir);
        fs::write(&path, "{not json").unwrap();
        let s = load(&path);
        assert_eq!(s, Settings::default());
        assert!(dir.join("settings.corrupt.json").exists());
    }

    #[test]
    fn round_trip() {
        let dir = temp_dir("roundtrip");
        let path = settings_path(&dir);
        let mut s = Settings::default();
        s.physics = PhysicsProfile::Calm;
        s.rope_by_charm.insert("moon".into(), RopeStyle::Chain);
        save(&path, &s).unwrap();
        assert_eq!(load(&path), s);
    }
}
