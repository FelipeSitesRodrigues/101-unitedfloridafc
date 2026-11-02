/**
 * Imagens do site em src/assets/img, em AVIF e WebP e em várias larguras pra srcset, com o
 * manifesto.json (largura, altura e peso de cada arquivo, pro width/height do <img>). Base do 0100.
 *
 * Origens (../0101 - United Florida FC/Recursos Site):
 * - ia/: fotos geradas no ChatGPT em 2026-11-01 e 02, aprovadas pelo Felipe seção por seção
 * - site-antigo-khone/: escudo, logos da Reebok e da UPSL (do site que o Maicon rejeitou)
 * - maicon/: print do Instagram do Maicon (provisória até ele mandar a original)
 * - insumos/: recortes sem fundo (scripts/recortar.mjs do 0100, @imgly/background-removal-node)
 *
 * Uso: node scripts/processar-imagens.mjs   (depois: node build.mjs)
 */
import sharp from 'sharp'
import { mkdirSync, writeFileSync, rmSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'

const R = '../0101 - United Florida FC/Recursos Site'
const IA = `${R}/ia`
const OUT = 'src/assets/img'
mkdirSync(OUT, { recursive: true })
for (const f of readdirSync(OUT)) if (f !== 'bandeiras') rmSync(path.join(OUT, f), { recursive: true, force: true })
const manifesto = {}

async function gravar(pipeline, nome) {
  const info = await pipeline.toFile(path.join(OUT, nome))
  manifesto[nome] = { w: info.width, h: info.height, kb: Math.round(info.size / 1024) }
}

// corte em fração da imagem: [esquerda, topo, largura, altura]
async function preparar(origem, { corte, blur } = {}) {
  let buf = await sharp(origem).rotate().toBuffer()
  if (corte) {
    const m = await sharp(buf).metadata()
    buf = await sharp(buf).extract({
      left: Math.round(m.width * corte[0]), top: Math.round(m.height * corte[1]),
      width: Math.round(m.width * corte[2]), height: Math.round(m.height * corte[3]),
    }).toBuffer()
  }
  if (blur) buf = await sharp(buf).blur(blur).toBuffer()
  return buf
}

// uma imagem em várias larguras, AVIF e WebP. ampliar: deixa passar da largura da origem
async function variantes(nome, origem, larguras, op = {}) {
  const buf = Buffer.isBuffer(origem) ? origem : await preparar(origem, op)
  const { width } = await sharp(buf).metadata()
  for (const w of larguras) {
    if (w > width * 1.02 && !op.ampliar) continue
    for (const f of ['avif', 'webp']) {
      let p = sharp(buf).resize({ width: w, kernel: 'lanczos3' })
      p = f === 'avif'
        ? p.avif({ quality: op.alfa ? 60 : op.q ?? 50, effort: 7, chromaSubsampling: op.alfa ? '4:4:4' : '4:2:0' })
        : p.webp({ quality: op.alfa ? 84 : op.qw ?? 74, alphaQuality: 90, effort: 6, smartSubsample: true })
      await gravar(p, `${nome}-${w}.${f}`)
    }
  }
  console.log(nome.padEnd(22), larguras.join(', '))
}

// ---------------------------------------------------------------- hero
// Redesenho de 2026-11-02: cenário do estádio azul (ia/01-hero-fundo.png) e os jogadores que o
// ChatGPT gerou no fundo cinza, recortados pelo scripts/hero-jogadores-v2.mjs. Celular: os
// jogadores já compostos sobre o cenário (insumos/hero-celular.png, do mesmo script).
await variantes('hero-fundo', `${IA}/01-hero-fundo.png`, [1280, 1672], { q: 46, qw: 70 })
await variantes('hero-jogadores', 'insumos/hero-jogadores.png', [640, 884], { alfa: true })
await variantes('hero-celular', 'insumos/hero-celular.png', [480, 840])
// as três fotos redondas de "Peneiras abertas": rostos dos garotos da foto da peneira
for (const [i, [l, t, z]] of [[40, 385, 230], [405, 235, 250], [615, 330, 210]].entries()) {
  const buf = await sharp(`${IA}/13-peneira.png`).extract({ left: l, top: t, width: z, height: z }).toBuffer()
  await variantes(`avatar-${i + 1}`, buf, [96])
}

// ---------------------------------------------------------------- o clube
// foto nova do redesenho (ia/03-clube-v3.png); o degradê pro azul é CSS
await variantes('clube', `${IA}/03-clube-v3.png`, [480, 760, 1170], { corte: [0, 0, 0.7, 1] })

// ---------------------------------------------------------------- uniformes: o vestiário
await variantes('vestiario', `${IA}/14-vestiario-fundo.png`, [960, 1672], { q: 44, qw: 68 })

// ---------------------------------------------------------------- o caminho (faixas)
await variantes('etapa-upsl', `${IA}/04-etapa-upsl.png`, [760, 1280])
await variantes('etapa-opencup', `${IA}/05-etapa-opencup.png`, [760, 1280])
await variantes('etapa-mls', 'insumos/06-etapa-mls-v2.png', [760, 1280]) // scripts/etapa-mls.mjs: número e detalhes pintados

// ---------------------------------------------------------------- camisas
// As três vieram no mesmo enquadramento (1024x1536). A marinho já veio sem fundo; a branca e a
// celeste foram recortadas. Corta as três no MESMO retângulo (a união dos alfas), pra elas
// trocarem de lugar no carrossel sem pular de tamanho.
const camisas = {
  marinho: `${IA}/07-camisa-marinho.png`,
  branca: 'insumos/08-camisa-branca-recorte.png',
  celeste: 'insumos/09-camisa-celeste-recorte.png',
}
let caixa = null
for (const arq of Object.values(camisas)) {
  const { data, info } = await sharp(arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let [x0, y0, x1, y1] = [info.width, info.height, 0, 0]
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[(y * info.width + x) * 4 + 3] > 24) {
        if (x < x0) x0 = x
        if (y < y0) y0 = y
        if (x > x1) x1 = x
        if (y > y1) y1 = y
      }
  caixa = caixa ? [Math.min(caixa[0], x0), Math.min(caixa[1], y0), Math.max(caixa[2], x1), Math.max(caixa[3], y1)] : [x0, y0, x1, y1]
}
const [cx0, cy0, cx1, cy1] = [Math.max(0, caixa[0] - 8), Math.max(0, caixa[1] - 8), Math.min(1023, caixa[2] + 8), Math.min(1535, caixa[3] + 8)]
console.log('caixa das camisas', [cx0, cy0, cx1, cy1].join(', '))
for (const [nome, arq] of Object.entries(camisas)) {
  const buf = await sharp(arq).ensureAlpha().extract({ left: cx0, top: cy0, width: cx1 - cx0, height: cy1 - cy0 }).png().toBuffer()
  await variantes(`camisa-${nome}`, buf, [280, 420, 560, 840], { alfa: true })
  // versão desfocada das laterais do carrossel: troca por opacidade, nunca filter animado
  const borrada = await sharp(buf).resize({ width: 420 }).blur(7).png().toBuffer()
  await variantes(`camisa-${nome}-borrada`, borrada, [420], { alfa: true })
}

// ---------------------------------------------------------------- detalhes, boné e loja
await variantes('detalhe-escudo', `${IA}/10a-escudo.png`, [420, 640], { corte: [0.08, 0.04, 0.84, 0.92] })
await variantes('detalhe-reebok', `${IA}/10b-reebok.png`, [420, 640], { corte: [0.08, 0.04, 0.84, 0.92] })
await variantes('detalhe-gola', `${IA}/10c-gola.png`, [420, 640], { corte: [0.08, 0.04, 0.84, 0.92] })
await variantes('detalhe-patch', `${IA}/10d-patch.png`, [420, 640], { corte: [0.08, 0.04, 0.84, 0.92] })
{
  const buf = await sharp('insumos/11-bone-recorte.png').trim({ threshold: 1 }).png().toBuffer()
  await variantes('bone', buf, [360, 560], { alfa: true })
}
await variantes('loja', `${IA}/12-loja-amigos.png`, [800, 1280, 1672])

// ---------------------------------------------------------------- fundador
// Print do Instagram (642x833) com as setas do carrossel por cima: cada seta (círculo de ~16 px)
// é preenchida por difusão a partir da borda (RGBA, então do lado de fora vira transparente), e
// a base com os pontinhos de página sai no corte. Provisória: pedir a original ao Maicon.
{
  const { data, info } = await sharp('insumos/maicon-recorte.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: W } = info
  const setas = [[29, 417, 18, true], [611, 417, 18, false]]
  for (const [cx, cy, r, borda] of setas) {
    const dentro = []
    for (let y = cy - r; y <= cy + r; y++)
      for (let x = cx - r; x <= cx + r; x++) if (x >= 0 && x < W && Math.hypot(x - cx, y - cy) <= r) dentro.push([x, y])
    // pré-multiplica, difunde 400 vezes e desfaz
    const px = new Float32Array(data.length)
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3] / 255
      px[i] = data[i] * a
      px[i + 1] = data[i + 1] * a
      px[i + 2] = data[i + 2] * a
      px[i + 3] = data[i + 3]
    }
    for (let it = 0; it < 400; it++)
      for (const [x, y] of dentro) {
        const i = (y * W + x) * 4
        for (let c = 0; c < 4; c++) {
          const v = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].filter(([a]) => a >= 0 && a < W).map(([a, b]) => px[(b * W + a) * 4 + c])
          px[i + c] = v.reduce((s, n) => s + n, 0) / v.length
        }
      }
    for (const [x, y] of dentro) {
      const i = (y * W + x) * 4
      const a = px[i + 3]
      // seta na borda da manga: alfa meio a meio vira mancha cinza; ali é manga ou é vazio
      data[i + 3] = borda ? (a > 150 ? 255 : 0) : Math.round(a)
      for (let c = 0; c < 3; c++) data[i + c] = a > 1 ? Math.min(255, Math.round((px[i + c] / a) * 255)) : 0
    }
  }
  const limpo = await sharp(data, { raw: info }).png().toBuffer()
  const corte = await sharp(limpo).extract({ left: 0, top: 0, width: 642, height: 800 }).png().toBuffer()
  writeFileSync('insumos/maicon-limpo.png', corte)
  const ampliada = await sharp(corte).resize({ width: 963, kernel: 'lanczos3' }).sharpen({ sigma: 0.6 }).png().toBuffer()
  await variantes('maicon', ampliada, [480, 720, 963], { alfa: true })
}

// ---------------------------------------------------------------- peneira
await variantes('peneira', `${IA}/13-peneira.png`, [560, 900], { corte: [0, 0.04, 1, 0.9] })

// ---------------------------------------------------------------- marcas
const K = `${R}/site-antigo-khone`
await variantes('escudo', `${K}/logo-escudo-900.webp`, [120, 240, 480], { alfa: true })
await variantes('reebok', `${K}/logo-reebok-branco.webp`, [192], { alfa: true })

// ---------------------------------------------------------------- banner da loja (/loja/)
await sharp('insumos/loja-banner-1920x720.png').webp({ quality: 78 }).toFile(path.join(OUT, 'loja-banner.webp'))

// ---------------------------------------------------------------- og e ícones
{
  const og = await sharp('insumos/hero-og.png').resize({ width: 1200, height: 630, fit: 'cover' }).jpeg({ quality: 82, mozjpeg: true }).toBuffer()
  writeFileSync(path.join(OUT, 'og.jpg'), og)
  const raiz = 'src/raiz'
  mkdirSync(raiz, { recursive: true })
  const icone = (n) => sharp(`${K}/logo-escudo-900.webp`).resize({ width: n, height: n, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png()
  await icone(32).toFile(`${raiz}/favicon-32.png`)
  await icone(192).toFile(`${raiz}/icon-192.png`)
  await sharp(`${K}/logo-escudo-900.webp`).resize({ width: 160, height: 160, fit: 'contain', background: '#0E2664' }).extend({ top: 10, bottom: 10, left: 10, right: 10, background: '#0E2664' }).png().toFile(`${raiz}/apple-touch-icon.png`)
  // favicon.ico com um PNG de 32 px dentro (o formato aceita PNG desde o Vista)
  const png = await icone(32).toBuffer()
  const ico = Buffer.alloc(22)
  ico.writeUInt16LE(0, 0); ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4)
  ico.writeUInt8(32, 6); ico.writeUInt8(32, 7); ico.writeUInt16LE(1, 10); ico.writeUInt16LE(32, 12)
  ico.writeUInt32LE(png.length, 14); ico.writeUInt32LE(22, 18)
  writeFileSync(`${raiz}/favicon.ico`, Buffer.concat([ico, png]))
}

await import('./loja-fotos.mjs')

writeFileSync(path.join(OUT, 'manifesto.json'), JSON.stringify(manifesto, null, 1))
const total = Object.values(manifesto).reduce((s, m) => s + m.kb, 0)
console.log(`ok ${Object.keys(manifesto).length} arquivos, ${total} KB no total`)
if (!existsSync(`${R}/maicon/maicon-original.jpg`)) console.log('pendente: foto original do Maicon (hoje é o print do Instagram, 642 px)')
