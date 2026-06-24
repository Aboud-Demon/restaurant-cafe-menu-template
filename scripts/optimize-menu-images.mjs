import { mkdir, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const sourceDir = path.resolve('public/category-heroes')
const outputDir = path.resolve('public/images/menu')
const maxBytes = 250 * 1024

await mkdir(outputDir, { recursive: true })

const files = (await readdir(sourceDir)).filter((file) => file.toLowerCase().endsWith('.png'))

for (const file of files) {
  const inputPath = path.join(sourceDir, file)
  const outputPath = path.join(outputDir, `${path.parse(file).name}.webp`)

  let quality = 76
  let buffer = await renderImage(inputPath, quality)

  while (buffer.byteLength > maxBytes && quality > 38) {
    quality -= 6
    buffer = await renderImage(inputPath, quality)
  }

  await sharp(buffer).toFile(outputPath)

  const info = await stat(outputPath)
  console.log(`${path.basename(outputPath)}  ${Math.round(info.size / 1024)}KB  q=${quality}`)
}

async function renderImage(inputPath, quality) {
  return sharp(inputPath)
    .resize(800, 800, {
      fit: 'cover',
      position: 'centre',
      withoutEnlargement: true,
    })
    .webp({
      quality,
      effort: 6,
    })
    .toBuffer()
}
