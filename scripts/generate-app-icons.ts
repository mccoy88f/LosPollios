/**
 * Genera PNG statici in public/icons/ da SVG (Sharp).
 * Stessa logica visiva del 32×32: rx = 18%, urna al 52%.
 * Esegui: npm run generate:icons
 */
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import sharp from 'sharp'
import { buildAppIconSvg } from '../src/lib/appIconSvg'

const OUT_DIR = join(process.cwd(), 'public', 'icons')

const OUTPUTS = [
  { size: 32, file: 'icon-32.png' },
  { size: 180, file: 'icon-180.png' },
  { size: 192, file: 'icon-192.png' },
  { size: 512, file: 'icon-512.png' },
] as const

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const masterSvg = buildAppIconSvg(512)
  await writeFile(join(OUT_DIR, 'icon.svg'), masterSvg, 'utf8')
  console.log(`✓ ${join(OUT_DIR, 'icon.svg')} (master 512)`)

  for (const { size, file } of OUTPUTS) {
    const svg = buildAppIconSvg(size)
    const outPath = join(OUT_DIR, file)
    await sharp(Buffer.from(svg)).png().toFile(outPath)
    console.log(`✓ ${outPath} (${size}×${size})`)
  }

  const { copyFile } = await import('fs/promises')
  const faviconPath = join(process.cwd(), 'public', 'favicon.png')
  await copyFile(join(OUT_DIR, 'icon-32.png'), faviconPath)
  console.log(`✓ ${faviconPath} (copia da icon-32)`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
