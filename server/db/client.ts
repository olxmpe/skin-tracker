import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'

function getDbPath(): string {
  const dataDir = process.env.SKINTRACKER_DATA_DIR ?? path.join(os.homedir(), '.skintracker')
  const resolved = dataDir.startsWith('~')
    ? path.join(os.homedir(), dataDir.slice(1))
    : dataDir
  fs.mkdirSync(resolved, { recursive: true })
  return path.join(resolved, 'db.sqlite')
}

const sqlite = new Database(getDbPath())

// Performance pragmas
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')
sqlite.pragma('synchronous = NORMAL')

export const db = drizzle(sqlite, { schema })
export type DB = typeof db
