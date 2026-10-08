import { getDatabase } from "./db";
import { CsvMappingPreset } from "@/types/loyalty";

export function getAllPresets(restaurantId?: string): CsvMappingPreset[] {
  const db = getDatabase();
  let rows: Array<{
    id: number;
    restaurant_id: string | null;
    system_name: string;
    mapping_config: string;
    delimiter: string;
    created_at: string;
  }>;

  if (restaurantId) {
    rows = db.prepare(`
      SELECT * FROM csv_mapping_presets
      WHERE restaurant_id IS NULL OR restaurant_id = ?
      ORDER BY system_name ASC
    `).all(restaurantId) as any;
  } else {
    rows = db.prepare("SELECT * FROM csv_mapping_presets ORDER BY system_name ASC").all() as any;
  }

  return rows.map((r) => {
    let parsedConfig = {};
    try {
      parsedConfig = JSON.parse(r.mapping_config);
    } catch {
      parsedConfig = {};
    }
    return {
      ...r,
      mapping_config: parsedConfig,
    };
  });
}

export function getPresetById(id: number, restaurantId?: string): CsvMappingPreset | null {
  const db = getDatabase();
  let r: {
    id: number;
    restaurant_id: string | null;
    system_name: string;
    mapping_config: string;
    delimiter: string;
    created_at: string;
  } | undefined;

  if (restaurantId) {
    r = db.prepare("SELECT * FROM csv_mapping_presets WHERE id = ? AND (restaurant_id IS NULL OR restaurant_id = ?)").get(id, restaurantId) as any;
  } else {
    r = db.prepare("SELECT * FROM csv_mapping_presets WHERE id = ?").get(id) as any;
  }

  if (!r) return null;
  let parsedConfig = {};
  try {
    parsedConfig = JSON.parse(r.mapping_config);
  } catch {
    parsedConfig = {};
  }
  return {
    ...r,
    mapping_config: parsedConfig,
  };
}

export function savePreset(
  systemName: string,
  mappingConfig: Record<string, string>,
  delimiter = ";",
  restaurantId?: string
): CsvMappingPreset {
  const db = getDatabase();
  const cleanName = systemName.trim();
  const serialized = JSON.stringify(mappingConfig);

  let existing: { id: number } | undefined;
  if (restaurantId) {
    existing = db.prepare("SELECT id FROM csv_mapping_presets WHERE system_name = ? AND restaurant_id = ?").get(cleanName, restaurantId) as any;
  } else {
    existing = db.prepare("SELECT id FROM csv_mapping_presets WHERE system_name = ? AND restaurant_id IS NULL").get(cleanName) as any;
  }

  if (existing) {
    db.prepare(`
      UPDATE csv_mapping_presets
      SET mapping_config = ?, delimiter = ?
      WHERE id = ?
    `).run(serialized, delimiter, existing.id);
    return getPresetById(existing.id, restaurantId)!;
  } else {
    const info = db.prepare(`
      INSERT INTO csv_mapping_presets (restaurant_id, system_name, mapping_config, delimiter)
      VALUES (?, ?, ?, ?)
    `).run(restaurantId || null, cleanName, serialized, delimiter);
    return getPresetById(Number(info.lastInsertRowid), restaurantId)!;
  }
}

export function deletePreset(id: number, restaurantId?: string): boolean {
  const db = getDatabase();
  let info: { changes: number };
  if (restaurantId) {
    info = db.prepare("DELETE FROM csv_mapping_presets WHERE id = ? AND restaurant_id = ?").run(id, restaurantId);
  } else {
    info = db.prepare("DELETE FROM csv_mapping_presets WHERE id = ?").run(id);
  }
  return info.changes > 0;
}
