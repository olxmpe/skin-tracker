import { Request, Response, NextFunction } from 'express'

const APP_PASSWORD = process.env.APP_PASSWORD

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!APP_PASSWORD) return next()
  if (req.method === 'OPTIONS') return next()

  const token = req.headers['x-app-token'] as string | undefined
  if (token !== APP_PASSWORD) {
    return res.status(401).json({ error: 'Non autorisé' })
  }
  next()
}
