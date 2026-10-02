import { backend } from "../ipc/backend";
import { createCollection } from "../state/collections";
import { refreshCustomCharms } from "../state/stores";
import { dataUrlToBase64, prepareImage, readImageFile } from "./process";

export interface BulkProgress {
  done: number;
  total: number;
}

export interface BulkResult {
  collectionId: string;
  imported: number;
  skipped: number;
}

function nameFromFile(name: string) {
  const base = name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, 40);
  return base ? base[0].toUpperCase() + base.slice(1) : "Charm";
}

function base64ToFile(picked: { name: string; base64: string }) {
  const bytes = Uint8Array.from(atob(picked.base64), (c) => c.charCodeAt(0));
  return new File([bytes], picked.name);
}

/** Turns a batch of images into custom charms, all processed locally, and groups them. */
export async function bulkImport(
  picked: { name: string; base64: string }[],
  collectionName: string,
  onProgress: (p: BulkProgress) => void,
): Promise<BulkResult> {
  const ids: string[] = [];
  let skipped = 0;
  for (let i = 0; i < picked.length; i++) {
    onProgress({ done: i, total: picked.length });
    try {
      const source = await readImageFile(base64ToFile(picked[i]));
      const prepared = prepareImage(source, source.backgroundRemovable);
      source.bitmap.close();
      const saved = await backend.saveCustomCharm({
        name: nameFromFile(picked[i].name),
        ropeStyle: "thread",
        anchorOffset: prepared.suggestedAnchor,
        defaultScale: 1,
        pngBase64: dataUrlToBase64(prepared.dataUrl),
        sound: "soft",
      });
      ids.push(saved.id);
    } catch {
      skipped++;
    }
  }
  onProgress({ done: picked.length, total: picked.length });
  await refreshCustomCharms();
  const collectionId = ids.length ? await createCollection(collectionName, ids) : "";
  return { collectionId, imported: ids.length, skipped };
}
