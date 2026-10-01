import { getDatabase } from "./db";
import { CsvMappingPreset } from "@/types/loyalty";

export function getAllPresets(): CsvMappingPreset[] {
  const db = getDatabase();
  const rows = db.prepare("SELECT * FROM csv_mapping_presets ORDER BY system_name ASC").all() as Array<{
    id: number;
    system_name: string;
    mapping_config: string;
    delimiter: string;
    created_at: string;
  }>;

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

export function getPresetById(id: number): CsvMappingPreset | null {
  const db = getDatabase();
  const r = db.prepare("SELECT * FROM csv_mapping_presets WHERE id = ?").get(id) as
    | {
        id: number;
        system_name: string;
        mapping_config: string;
        delimiter: string;
        created_at: string;
      }
    | undefined;

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
  delimiter = ";"
): CsvMappingPreset {
  const db = getDatabase();
  const cleanName = systemName.trim();
  const serialized = JSON.stringify(mappingConfig);

  const existing = db.prepare("SELECT id FROM csv_mapping_presets WHERE system_name = ?").get(cleanName) as { id: number } | undefined;

  if (existing) {
    db.prepare(`
      UPDATE csv_mapping_presets
      SET mapping_config = ?, delimiter = ?
      WHERE id = ?
    `).run(serialized, delimiter, existing.id);
    return getPresetById(existing.id)!;
  } else {
    const info = db.prepare(`
      INSERT INTO csv_mapping_presets (system_name, mapping_config, delimiter)
      VALUES (?, ?, ?)
    `).run(cleanName, serialized, delimiter);
    return getPresetById(Number(info.lastInsertRowid))!;
  }
}

export function deletePreset(id: number): boolean {
  const db = getDatabase();
  const info = db.prepare("DELETE FROM csv_mapping_presets WHERE id = ?").run(id);
  return info.changes > 0;
}
