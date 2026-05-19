import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as crypto from 'crypto'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

function getLocalPhotoDir(): string {
  const dataDir = (process.env.SKINTRACKER_DATA_DIR ?? path.join(os.homedir(), '.skintracker'))
    .replace(/^~/, os.homedir())
  const photoDir = path.join(dataDir, 'photos')
  fs.mkdirSync(photoDir, { recursive: true })
  return photoDir
}

function isR2Configured(): boolean {
  return !!(
    process.env.CLOUDFLARE_R2_ENDPOINT &&
    process.env.CLOUDFLARE_R2_ACCESS_KEY &&
    process.env.CLOUDFLARE_R2_SECRET_KEY &&
    process.env.CLOUDFLARE_R2_BUCKET
  )
}

function getR2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY!,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY!,
    },
  })
}

export async function savePhoto(buffer: Buffer, ext = 'jpg'): Promise<string> {
  const filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`

  if (isR2Configured()) {
    const client = getR2Client()
    await client.send(new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET!,
      Key: `photos/${filename}`,
      Body: buffer,
      ContentType: `image/${ext}`,
    }))
    return `photos/${filename}`
  }

  const filePath = path.join(getLocalPhotoDir(), filename)
  fs.writeFileSync(filePath, buffer)
  return filePath
}

export async function getPhotoBase64(photoPath: string): Promise<string | null> {
  try {
    if (isR2Configured() && !path.isAbsolute(photoPath)) {
      const client = getR2Client()
      const response = await client.send(new GetObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET!,
        Key: photoPath,
      }))
      const chunks: Uint8Array[] = []
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk)
      }
      return Buffer.concat(chunks).toString('base64')
    }

    if (fs.existsSync(photoPath)) {
      return fs.readFileSync(photoPath).toString('base64')
    }
    return null
  } catch {
    return null
  }
}

export async function getPhotoUrl(photoPath: string, expiresInSeconds = 3600): Promise<string> {
  if (isR2Configured() && !path.isAbsolute(photoPath)) {
    if (process.env.CLOUDFLARE_R2_PUBLIC_URL) {
      return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${photoPath}`
    }
    const client = getR2Client()
    return getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: process.env.CLOUDFLARE_R2_BUCKET!, Key: photoPath }),
      { expiresIn: expiresInSeconds },
    )
  }
  return `/api/photos/${encodeURIComponent(path.basename(photoPath))}`
}
