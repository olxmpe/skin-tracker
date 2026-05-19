import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db } from './client'
import path from 'path'

const migrationsFolder = path.resolve(process.cwd(), 'server/db/migrations')
migrate(db, { migrationsFolder })
console.log('✓ Migrations appliquées')
