/**
 * Downloads Iranian portrait photos into public/avatars/ for the avatar pool.
 * Run: node scripts/download-avatars.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'avatars')
const POOL_SIZE = 48

await mkdir(outDir, { recursive: true })

const res = await fetch(`https://randomuser.me/api/?results=${POOL_SIZE}&nat=ir&inc=picture`)
if (!res.ok) throw new Error(`randomuser.me failed: ${res.status}`)

const { results } = await res.json()
if (!Array.isArray(results) || results.length === 0) {
  throw new Error('No Iranian portraits returned from randomuser.me')
}

for (let i = 0; i < POOL_SIZE; i++) {
  const entry = results[i % results.length]
  const url = entry?.picture?.large
  if (!url) throw new Error(`Missing picture URL for pool item ${i + 1}`)

  const imgRes = await fetch(url)
  if (!imgRes.ok) throw new Error(`Failed to download ${url}: ${imgRes.status}`)

  const slug = `ir-${String(i + 1).padStart(2, '0')}`
  const buf = Buffer.from(await imgRes.arrayBuffer())
  await writeFile(join(outDir, `${slug}.jpg`), buf)
  console.log(`saved ${slug}.jpg`)
}

console.log(`Done — ${POOL_SIZE} Iranian avatars in public/avatars/`)
