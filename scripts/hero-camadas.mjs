/**
 * Hero em duas camadas: os jogadores recortados (nunca cortados pela tela, qualquer proporção) e
 * o cenário por trás (cover). Pedido do Felipe em 2026-11-02: a foto única 16:9 cortava a cabeça
 * do jogador da direita em janela larga e o marinho chapado da esquerda parecia artificial.
 *
 * 1. Recorte (insumos/hero-jogadores-recorte.png, do scripts/recortar.mjs): o modelo deixou o
 *    cubo de fora e um buraco na manga do jogador do meio. O cubo volta por retângulo medido na
 *    foto (x 1064-1280, y 700-895) e os buracos fechados (sem ligação com a borda) são tapados.
 *    Sombra suave no chão desenhada embaixo. Sai em insumos/hero-jogadores.png, já aparado.
 * 2. Cenário provisório (insumos/hero-fundo-provisorio.png): a própria foto sem os jogadores,
 *    tapada por push-pull. Vale até chegar o cenário do ChatGPT em Recursos Site/ia/01-hero-fundo.png.
 *
 * Uso: node scripts/hero-camadas.mjs   (depois: node scripts/processar-imagens.mjs)
 */
import sharp from 'sharp'

const ORIGEM = '../0101 - United Florida FC/Recursos Site/ia/01-hero-desktop.png'
const { data: rgb, info } = await sharp(ORIGEM).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: W, height: H } = info
const { data: rec } = await sharp('insumos/hero-jogadores-recorte.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const alfa = new Uint8Array(W * H)
for (let p = 0; p < W * H; p++) alfa[p] = rec[p * 4 + 3]

// cubo
for (let y = 700; y <= 895; y++) for (let x = 1064; x <= 1280; x++) alfa[y * W + x] = 255

// buracos: transparente que não alcança a borda da imagem vira opaco
const fora = new Uint8Array(W * H)
const fila = []
for (let x = 0; x < W; x++) fila.push(x, (H - 1) * W + x)
for (let y = 0; y < H; y++) fila.push(y * W, y * W + W - 1)
while (fila.length) {
  const p = fila.pop()
  if (fora[p] || alfa[p] >= 128) continue
  fora[p] = 1
  const x = p % W
  if (x > 0) fila.push(p - 1)
  if (x < W - 1) fila.push(p + 1)
  if (p >= W) fila.push(p - W)
  if (p < W * (H - 1)) fila.push(p + W)
}
let tapados = 0
for (let p = 0; p < W * H; p++) if (!fora[p] && alfa[p] < 255) (alfa[p] = 255), tapados++
console.log('pixels tapados nos buracos:', tapados)

// jogadores em RGBA com a cor original
const jog = Buffer.alloc(W * H * 4)
for (let p = 0; p < W * H; p++) {
  jog[p * 4] = rgb[p * 3]
  jog[p * 4 + 1] = rgb[p * 3 + 1]
  jog[p * 4 + 2] = rgb[p * 3 + 2]
  jog[p * 4 + 3] = alfa[p]
}
// sombra no chão: elipse escura borrada embaixo dos pés, do banquinho e do cubo
const sombra = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><ellipse cx="1180" cy="905" rx="430" ry="34" fill="#030a1c" fill-opacity=".75"/></svg>`)).blur(16).png().toBuffer()
const camada = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: sombra }, { input: jog, raw: { width: W, height: H, channels: 4 } }])
  .png()
  .toBuffer()
await sharp(camada).trim({ threshold: 0 }).png().toFile('insumos/hero-jogadores.png')
const m = await sharp('insumos/hero-jogadores.png').metadata()
console.log('jogadores', m.width, 'x', m.height)

// cenário provisório: push-pull (média com peso em pirâmide) onde estavam os jogadores
const peso = new Float32Array(W * H)
{
  // dilata o recorte 6 px pra o contorno das pessoas não vazar no cenário
  const base = new Uint8Array(W * H)
  for (let p = 0; p < W * H; p++) base[p] = alfa[p] > 8 ? 1 : 0
  const dil = new Uint8Array(base)
  for (let r = 0; r < 6; r++) {
    const c = new Uint8Array(dil)
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const p = y * W + x
      if (c[p - 1] || c[p + 1] || c[p - W] || c[p + W]) dil[p] = 1
    }
  }
  for (let p = 0; p < W * H; p++) peso[p] = dil[p] ? 0 : 1
}
const niveis = []
let cw = W
let ch = H
let pre = new Float32Array(W * H * 3)
let pw = peso
for (let p = 0; p < W * H; p++) for (let c = 0; c < 3; c++) pre[p * 3 + c] = rgb[p * 3 + c] * peso[p]
niveis.push({ w: cw, h: ch, pre, pw })
while (cw > 4 && ch > 4) {
  const nw = Math.ceil(cw / 2)
  const nh = Math.ceil(ch / 2)
  const npre = new Float32Array(nw * nh * 3)
  const npw = new Float32Array(nw * nh)
  for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
    let s = 0
    const a = [0, 0, 0]
    let n = 0
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const sx = Math.min(cw - 1, x * 2 + dx)
      const sy = Math.min(ch - 1, y * 2 + dy)
      const q = sy * cw + sx
      s += pw[q]
      for (let c = 0; c < 3; c++) a[c] += pre[q * 3 + c]
      n++
    }
    const q = y * nw + x
    npw[q] = s / n
    for (let c = 0; c < 3; c++) npre[q * 3 + c] = a[c] / n
  }
  cw = nw
  ch = nh
  pre = npre
  pw = npw
  niveis.push({ w: cw, h: ch, pre, pw })
}
// do mais grosso pro mais fino: cor = pré + (1 - peso) * cor de cima (bilinear)
let topo = niveis[niveis.length - 1]
let cor = new Float32Array(topo.w * topo.h * 3)
for (let q = 0; q < topo.w * topo.h; q++) for (let c = 0; c < 3; c++) cor[q * 3 + c] = topo.pw[q] > 0 ? topo.pre[q * 3 + c] / topo.pw[q] : 30
for (let i = niveis.length - 2; i >= 0; i--) {
  const nv = niveis[i]
  const nc = new Float32Array(nv.w * nv.h * 3)
  for (let y = 0; y < nv.h; y++) for (let x = 0; x < nv.w; x++) {
    const fx = Math.min(topo.w - 1, Math.max(0, (x + 0.5) / 2 - 0.5))
    const fy = Math.min(topo.h - 1, Math.max(0, (y + 0.5) / 2 - 0.5))
    const x0 = Math.floor(fx)
    const y0 = Math.floor(fy)
    const x1 = Math.min(topo.w - 1, x0 + 1)
    const y1 = Math.min(topo.h - 1, y0 + 1)
    const tx = fx - x0
    const ty = fy - y0
    const q = y * nv.w + x
    for (let c = 0; c < 3; c++) {
      const up =
        cor[(y0 * topo.w + x0) * 3 + c] * (1 - tx) * (1 - ty) + cor[(y0 * topo.w + x1) * 3 + c] * tx * (1 - ty) +
        cor[(y1 * topo.w + x0) * 3 + c] * (1 - tx) * ty + cor[(y1 * topo.w + x1) * 3 + c] * tx * ty
      nc[q * 3 + c] = nv.pre[q * 3 + c] + (1 - nv.pw[q]) * up
    }
  }
  cor = nc
  topo = nv
}
const fundo = Buffer.alloc(W * H * 3)
for (let i = 0; i < fundo.length; i++) fundo[i] = Math.max(0, Math.min(255, Math.round(cor[i])))
await sharp(fundo, { raw: { width: W, height: H, channels: 3 } }).png().toFile('insumos/hero-fundo-provisorio.png')
console.log('ok insumos/hero-jogadores.png e insumos/hero-fundo-provisorio.png')
