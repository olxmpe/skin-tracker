import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'http'
import path from 'path'
import fs from 'fs'
import os from 'os'

import { checkinRouter } from './routes/checkin'
import { chatRouter } from './routes/chat'
import { entriesRouter } from './routes/entries'
import { combosRouter } from './routes/combos'
import { productsRouter } from './routes/products'
import { nutritionRouter } from './routes/nutrition'
import { knownFoodsRouter } from './routes/known-foods'
import { analyticsRouter } from './routes/analytics'
import { profileRouter } from './routes/profile'
import { reportsRouter } from './routes/reports'
import { evolutionRouter } from './routes/evolution'
import { whatsappRouter } from './routes/whatsapp-webhook'
import { importRouter } from './routes/import'
import { startWeeklyReportCron } from './jobs/weekly-report'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db } from './db/client'

const app = express()
const server = createServer(app)
const PORT = parseInt(process.env.PORT ?? '3001')

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' }))
app.use(express.json({ limit: '10mb' }))

// Conserver le body brut pour la validation signature WhatsApp
app.use('/webhook/whatsapp', express.raw({ type: 'application/json' }), (req, _res, next) => {
  if (Buffer.isBuffer(req.body)) {
    req.body = JSON.parse(req.body.toString())
  }
  next()
})

// ── Routes API ────────────────────────────────────────────────────────────────
app.use('/api/checkin', checkinRouter)
app.use('/api/chat', chatRouter)
app.use('/api/entries', entriesRouter)
app.use('/api/combos', combosRouter)
app.use('/api/products', productsRouter)
app.use('/api/nutrition', nutritionRouter)
app.use('/api/known-foods', knownFoodsRouter)
app.use('/api/analytics', analyticsRouter)
app.use('/api/profile', profileRouter)
app.use('/api/reports', reportsRouter)
app.use('/api/evolution', evolutionRouter)
app.use('/api/import', importRouter)
app.use('/webhook/whatsapp', whatsappRouter)

// Servir les photos locales
const localPhotoDir = path.join(
  (process.env.SKINTRACKER_DATA_DIR ?? path.join(os.homedir(), '.skintracker')).replace(/^~/, os.homedir()),
  'photos'
)
app.use('/api/photos', express.static(localPhotoDir))

// ── WebSocket ────────────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server, path: '/ws' })
const wsClients = new Set<WebSocket>()

wss.on('connection', (ws) => {
  wsClients.add(ws)
  ws.on('close', () => wsClients.delete(ws))
})

export function broadcastWS(event: string, data: unknown) {
  const payload = JSON.stringify({ event, data, ts: Date.now() })
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) client.send(payload)
  }
}

// ── Démarrage ─────────────────────────────────────────────────────────────────
migrate(db, { migrationsFolder: path.resolve(process.cwd(), 'server/db/migrations') })

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ SkinTracker backend → http://0.0.0.0:${PORT}`)
  startWeeklyReportCron()
})

export default app
