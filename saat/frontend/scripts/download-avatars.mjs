import { mkdir, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'avatars')

/** id -> randomuser.me portrait path (e.g. "women/44") */
const portraits = {
  'a-me': 'women/44',
  a2: 'women/68',
  a3: 'men/32',
  a4: 'men/12',
  a5: 'men/22',
  a6: 'women/26',
  a7: 'men/45',
  a8: 'women/89',
  a9: 'men/51',
  'a-leader': 'men/67',
  'a-sup': 'women/17',
  'a-mgr': 'men/75',
  l1: 'men/15',
  l2: 'women/12',
  l3: 'men/18',
  l4: 'women/33',
  l5: 'men/28',
  l6: 'women/55',
  l7: 'men/36',
  l8: 'women/41',
  l9: 'women/62',
  l10: 'men/41',
  l11: 'women/72',
  l12: 'men/52',
  l13: 'women/81',
  l14: 'men/61',
  l15: 'women/48',
  l16: 'men/73',
  l17: 'women/90',
  l18: 'men/84',
  l19: 'women/25',
  l20: 'men/93',
  l21: 'women/37',
  l22: 'men/19',
  l23: 'women/58',
  l24: 'men/46',
  l25: 'women/63',
  l26: 'men/55',
  l27: 'women/77',
  l28: 'men/66',
  l29: 'women/29',
  l30: 'men/38',
  l31: 'women/50',
  l32: 'women/65',
}

await mkdir(outDir, { recursive: true })

for (const [id, path] of Object.entries(portraits)) {
  const url = `https://randomuser.me/api/portraits/${path}.jpg`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(join(outDir, `${id}.jpg`), buf)
  console.log(`saved ${id}.jpg`)
}

console.log(`Done — ${Object.keys(portraits).length} avatars in public/avatars/`)
