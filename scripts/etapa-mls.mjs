// Foto da etapa MLS: número 10 nas costas do jogador do United e detalhes pretos na camisa rosa
// (gola, punhos, laterais), pintados por cima da foto mantendo as dobras do tecido. Os logos
// pequenos da camisa e do calção rosa são apagados. O rosto do adversário continua igual: trocar
// a foto antes de publicar. Coordenadas medidas num recorte que começa em x = 752.
// Uso: node scripts/etapa-mls.mjs [pasta-de-previa]   Sai em insumos/06-etapa-mls-v2.png
import sharp from 'sharp'
import { existsSync } from 'node:fs'
const ORIGEM = '../0101 - United Florida FC/Recursos Site/ia/06-etapa-mls.png'
const { data, info } = await sharp(ORIGEM).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: W, height: H } = info
const OX = 752
const px = new Float32Array(data)
const i3 = (x, y) => (y * W + x) * 3

// apaga logos: cada retângulo vira a mistura das cores das bordas, com o grão da foto
for (const [x0, y0, x1, y1] of [[590, 334, 613, 353], [596, 542, 613, 574], [598, 473, 632, 490]]) {
  const [a0, a1] = [x0 + OX, x1 + OX]
  for (let y = y0; y <= y1; y++) for (let x = a0; x <= a1; x++) {
    const tx = (x - a0) / (a1 - a0)
    const ty = (y - y0) / (y1 - y0)
    for (let c = 0; c < 3; c++) {
      const h = data[i3(a0 - 2, y) + c] * (1 - tx) + data[i3(a1 + 2, y) + c] * tx
      const v = data[i3(x, y0 - 2) + c] * (1 - ty) + data[i3(x, y1 + 2) + c] * ty
      px[i3(x, y) + c] = (h + v) / 2
    }
  }
}

const mascara = async (svg, blur) => {
  const { data: m } = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#000"/><g transform="translate(${OX} 0)" fill="#fff" stroke="#fff">${svg}</g></svg>`))
    .blur(blur).removeAlpha().extractChannel(0).raw().toBuffer({ resolveWithObject: true })
  return m
}

// listras verticais no próprio rosa, um tom mais escuro, inclinadas com o corpo (sem marca nenhuma)
const listras = await mascara(`<g fill="none" stroke-width="27">${[-70, -14, 42, 98].map((d) => `<path d="M${622 + d} 262 L${690 + d} 540"/>`).join('')}</g>`, 1.2)
for (let y = 230; y < 545; y++) for (let x = OX + 520; x < OX + 800; x++) {
  const p = y * W + x
  const a = listras[p] / 255
  const [r, g, b] = [px[p * 3], px[p * 3 + 1], px[p * 3 + 2]]
  if (!a || !(r - g > 30 && b - g > 6)) continue
  const k = 1 - a * 0.13
  px[p * 3] = r * k
  px[p * 3 + 1] = g * k
  px[p * 3 + 2] = b * k
}

// detalhes pretos: só onde o pixel é rosa (r bem maior que g, b acima de g), que exclui pele e torcida
const detalhes = await mascara(`
  <g fill="none" stroke-linecap="butt">
    <path d="M586 266 Q618 306 662 236" stroke-width="13"/>
    <path d="M531 357 L586 385" stroke-width="15"/>
    <path d="M755 362 L788 327" stroke-width="15"/>
    <path d="M592 398 L600 478" stroke-width="9"/>
    <path d="M762 372 L782 528" stroke-width="9"/>
    <path d="M596 505 L606 602" stroke-width="9"/>
    <path d="M781 528 L778 622" stroke-width="9"/>
  </g>
  <!-- SÓ PRA PRÉVIA, sair antes de publicar: a palavra no peito; o escudo enviado pelo Felipe entra no fim do script -->
  <g stroke="none">
    <text x="664" y="402" transform="rotate(5 664 402)" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="31" letter-spacing="1">MIAMI</text>
  </g>`, 0.8)
for (let y = 0; y < H; y++) for (let x = OX + 500; x < OX + 810 && x < W; x++) {
  const p = y * W + x
  const a = detalhes[p] / 255
  if (!a) continue
  const [r, g, b] = [px[p * 3], px[p * 3 + 1], px[p * 3 + 2]]
  if (!(r - g > 30 && b - g > 6)) continue
  const k = 1 - a * 0.84
  px[p * 3] = r * k + a * 6
  px[p * 3 + 1] = g * k + a * 6
  px[p * 3 + 2] = b * k + a * 10
}

// número 10 em bloco, inclinado com as costas; o claro e o escuro vêm do tecido
const CX = 287
const CY = 402
const numero = await mascara(`<g stroke="none" transform="translate(${CX} ${CY}) matrix(.84 -.06 .21 .84 0 0)">
    <path d="M-62 -52 L-34 -58 L-16 -58 L-16 58 L-42 58 L-42 -32 L-62 -28 Z"/>
    <path fill-rule="evenodd" d="M2 -40 Q2 -58 20 -58 L52 -58 Q70 -58 70 -40 L70 40 Q70 58 52 58 L20 58 Q2 58 2 40 Z M28 -34 L28 34 L44 34 L44 -34 Z"/>
  </g>`, 0.7)
for (let y = 0; y < H; y++) for (let x = OX + 150; x < OX + 450; x++) {
  const p = y * W + x
  const a = numero[p] / 255
  if (!a) continue
  const L = (data[p * 3] + data[p * 3 + 1] + data[p * 3 + 2]) / 3
  const luz = Math.min(1, Math.max(0.62, 0.72 + (L - 34) / 80))
  px[p * 3] = px[p * 3] * (1 - a) + 238 * luz * a
  px[p * 3 + 1] = px[p * 3 + 1] * (1 - a) + 240 * luz * a
  px[p * 3 + 2] = px[p * 3 + 2] * (1 - a) + 245 * luz * a
}

const fim = Buffer.alloc(px.length)
for (let i = 0; i < px.length; i++) fim[i] = Math.max(0, Math.min(255, Math.round(px[i])))
// SÓ PRA PRÉVIA, sair antes de publicar: escudo salvo pelo Felipe em insumos/previa-logo-adversario.png.
// Sem o arquivo, a foto sai sem escudo. O retângulo do escudo é conferido: quadrado, senão é arquivo errado.
const ARQ_LOGO = 'insumos/previa-logo-adversario.png'
const base = sharp(fim, { raw: { width: W, height: H, channels: 3 } })
let camadas = []
if (existsSync(ARQ_LOGO)) {
  const m = await sharp(ARQ_LOGO).metadata()
  if (Math.abs(m.width - m.height) > m.width * 0.05) throw new Error(`${ARQ_LOGO} não é quadrado (${m.width}x${m.height}): arquivo errado?`)
  const D = 38
  const circulo = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${D}" height="${D}"><circle cx="${D / 2}" cy="${D / 2}" r="${D / 2}" fill="#fff"/></svg>`)
  const redondo = await sharp(ARQ_LOGO).ensureAlpha().resize(D, D).png().toBuffer()
  const logo = await sharp(redondo).composite([{ input: circulo, blend: 'dest-in' }]).png().toBuffer()
  camadas = [{ input: await sharp(logo).rotate(5, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), left: OX + 688, top: 303 }]
}
// SÓ PRA PRÉVIA, sair antes de publicar: marca de material enviada pelo Felipe (só as barras, sem a
// palavra), em preto. O alfa sai do escuro do arquivo, que é preto no branco.
const ARQ_MARCA = 'insumos/previa-logo-marca.png'
if (existsSync(ARQ_MARCA)) {
  const m = await sharp(ARQ_MARCA).metadata()
  const barras = await sharp(ARQ_MARCA).flatten({ background: '#fff' }).extract({ left: 150, top: 0, width: m.width - 210, height: 638 }).resize({ width: 32 }).greyscale().negate().png().toBuffer({ resolveWithObject: true })
  const alfa = await sharp(barras.data).extractChannel(0).raw().toBuffer()
  const preto = await sharp({ create: { width: barras.info.width, height: barras.info.height, channels: 3, background: { r: 14, g: 12, b: 18 } } }).joinChannel(alfa, { raw: { width: barras.info.width, height: barras.info.height, channels: 1 } }).png().toBuffer()
  camadas.push({ input: await sharp(preto).rotate(5, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), left: OX + 590, top: 332 })
}
await base.composite(camadas).png().toFile('insumos/06-etapa-mls-v2.png')
const previa = process.argv[2]
if (previa) await sharp('insumos/06-etapa-mls-v2.png').extract({ left: OX, top: 0, width: 920, height: 659 }).toFile(`${previa}/mls-v2.png`)
console.log('ok insumos/06-etapa-mls-v2.png')
