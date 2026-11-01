import { TABLES, type AppDB } from '../storage/db'

export const BACKUP_VERSION = 1

export interface Backup {
  app: 'english-hse-coach'
  version: number
  exportedAt: string
  data: Record<string, unknown[]>
}

/** Exporte toutes les données locales. La clé API n'est JAMAIS incluse (elle n'est pas dans la base). */
export async function exportAll(db: AppDB): Promise<Backup> {
  const data: Record<string, unknown[]> = {}
  for (const t of TABLES) data[t] = await db.table(t).toArray()
  return { app: 'english-hse-coach', version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data }
}

export function validateBackup(x: unknown): Backup {
  if (!x || typeof x !== 'object') throw new Error('Fichier invalide.')
  const b = x as Partial<Backup>
  if (b.app !== 'english-hse-coach') throw new Error('Ce fichier n\'est pas une sauvegarde English-Environnement-Coach.')
  if (typeof b.version !== 'number' || b.version > BACKUP_VERSION) throw new Error('Version de sauvegarde non prise en charge.')
  if (!b.data || typeof b.data !== 'object') throw new Error('Sauvegarde sans données.')
  for (const t of TABLES) {
    const rows = (b.data as Record<string, unknown>)[t]
    if (rows !== undefined && !Array.isArray(rows)) throw new Error(`Table « ${t} » invalide.`)
  }
  return b as Backup
}

/** Remplace les données locales par celles de la sauvegarde (après validation complète). */
export async function importAll(db: AppDB, raw: unknown): Promise<void> {
  const b = validateBackup(raw)
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear()
      const rows = (b.data[t] ?? []) as object[]
      if (rows.length) await db.table(t).bulkPut(rows)
    }
  })
}

export async function clearAll(db: AppDB): Promise<void> {
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) await db.table(t).clear()
  })
}

/** Sauvegarde sous forme de fichier (pour le menu Partager de l'iPhone : Fichiers, iCloud Drive, AirDrop). */
export async function backupFile(db: AppDB): Promise<File> {
  return new File([JSON.stringify(await exportAll(db), null, 2)], 'english-environnement-coach-sauvegarde.json', { type: 'application/json' })
}
