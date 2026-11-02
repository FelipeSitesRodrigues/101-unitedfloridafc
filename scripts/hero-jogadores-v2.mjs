/**
 * Jogadores do hero novo (2026-11-02): o Felipe preferiu os jogadores que o ChatGPT gerou no
 * redesenho do hero. Vieram sozinhos num fundo cinza liso (ia/01-hero-jogadores.png) e o
 * recorte do scripts/recortar.mjs sai em insumos/hero-jogadores-v2-recorte.png.
 *
 * 1. O modelo deixa o cubo preto meio transparente: volta opaco por retângulo medido na foto.
 * 2. A borda traz o cinza do fundo, que vira halo no azul do estádio: a cor de cada pixel de
 *    borda é "descontaminada" (tira a parte do cinza conforme o alfa).
 * 3. Sombra suave no chão, embaixo dos pés, do banquinho e do cubo.
 * Sai em insumos/hero-jogadores.png (aparado) e insumos/hero-celular.png (os jogadores sobre um
 * corte do cenário, pra a foto do celular).
 *
 * Uso: node scripts/hero-jogadores-v2.mjs   (depois: node scripts/processar-imagens.mjs)
 */
import sharp from 'sharp'

const IA = '../0101 - United Florida FC/Recursos Site/ia'
const { data: rgb, info } = await sharp(`${IA}/01-hero-jogadores.png`).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: W, height: H } = info
const { data: rec } = await sharp('insumos/hero-jogadores-v2-recorte.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true })

const CINZA = [110, 110, 110]
const jog = Buffer.alloc(W * H * 4)
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const p = y * W + x
    let a = rec[p * 4 + 3]
    if (x >= 715 && x <= 960 && y >= 672 && y <= 873) a = 255 // cubo
    const t = a / 255
    for (let c = 0; c < 3; c++) {
      const v = t > 0.02 && t < 0.98 ? (rgb[p * 3 + c] - (1 - t) * CINZA[c]) / t : rgb[p * 3 + c]
      jog[p * 4 + c] = Math.max(0, Math.min(255, Math.round(v)))
    }
    jog[p * 4 + 3] = a
  }
}

const sombra = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <ellipse cx="840" cy="878" rx="420" ry="26" fill="#030a1c" fill-opacity=".8"/>
  <ellipse cx="840" cy="880" rx="250" ry="14" fill="#01040c" fill-opacity=".7"/></svg>`)).blur(14).png().toBuffer()
const camada = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: sombra }, { input: jog, raw: { width: W, height: H, channels: 4 } }])
  .png()
  .toBuffer()
const aparado = await sharp(camada).trim({ threshold: 0 }).png().toBuffer({ resolveWithObject: true })
await sharp(aparado.data).toFile('insumos/hero-jogadores.png')
console.log('jogadores', aparado.info.width, 'x', aparado.info.height, 'offset', aparado.info.trimOffsetLeft, aparado.info.trimOffsetTop)

// celular: os jogadores sobre o cenário, num corte 4:5 só deles
const fundo = await sharp(`${IA}/01-hero-fundo.png`).resize(W, H, { fit: 'cover' }).toBuffer()
const celular = await sharp(fundo).composite([{ input: camada }]).toBuffer()
const [cx, cw] = [400, 840]
const [cy, ch] = [20, 900]
await sharp(celular).extract({ left: cx, top: cy, width: cw, height: ch }).png().toFile('insumos/hero-celular.png')
console.log('ok insumos/hero-jogadores.png e insumos/hero-celular.png')
