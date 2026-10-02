use std::fs;
use std::path::Path;

fn main() {
    // Packs may reference built-in charms by id; collect the valid ids from /charms.
    let charms = Path::new("../charms");
    println!("cargo:rerun-if-changed=../charms");
    let mut ids: Vec<String> = fs::read_dir(charms)
        .map(|entries| {
            entries
                .flatten()
                .filter(|e| e.path().join("charm.json").exists())
                .filter_map(|e| e.file_name().into_string().ok())
                .collect()
        })
        .unwrap_or_default();
    ids.sort();
    let list = ids
        .iter()
        .map(|id| format!("{id:?}"))
        .collect::<Vec<_>>()
        .join(", ");
    let out = Path::new(&std::env::var("OUT_DIR").unwrap()).join("builtin_ids.rs");
    fs::write(out, format!("&[{list}]")).unwrap();

    tauri_build::build()
}
