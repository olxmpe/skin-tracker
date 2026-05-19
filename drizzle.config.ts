import type { Config } from 'drizzle-kit'
import * as os from 'os'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const dataDir = process.env.SKINTRACKER_DATA_DIR ?? path.join(os.homedir(), '.skintracker')

export default {
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: path.join(dataDir, 'db.sqlite'),
  },
} satisfies Config
