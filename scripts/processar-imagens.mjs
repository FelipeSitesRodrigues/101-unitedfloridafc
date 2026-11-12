/**
 * Imagens do site em src/assets/img, em AVIF e WebP e em várias larguras pra srcset, com o
 * manifesto.json (largura, altura e peso de cada arquivo, pro width/height do <img>). Base do 0100.
 *
 * Origens (../0101 - United Florida FC/Recursos Site):
 * - ia/: fotos geradas no ChatGPT em 2026-11-01 e 02, aprovadas pelo Felipe seção por seção
 * - ia2/: fotos refeitas na rodada do Maicon (2026-11-08), com o escudo oficial por cima
 *   (scripts/trocar-escudos.py); produtos/: fotos dos produtos que o Maicon mandou
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
// Rodada do Maicon (2026-11-08): uma foto só, larga (ia2/01-hero.png, 1942x809, escudos trocados
// pelo oficial no scripts/trocar-escudos.py). Celular: corte só dos três atletas.
const IA2 = `${R}/ia2`
await variantes('hero-v3', `${IA2}/01-hero.png`, [1280, 1942], { q: 48, qw: 72 })
{
  // celular: os três atletas desde o topo da foto (x 880, largura 980, altura 809), sem cortar o
  // cabelo. A foto é de 1942 e o recorte fica com 980, pouco pra tela de 3x: a versão
  // 01-hero-celular-2x.png é esse recorte ampliado 4x com Swin2SR e reduzido pra 1960 (2026-11-08)
  const ampliada = `${IA2}/01-hero-celular-2x.png`
  const buf = existsSync(ampliada) ? await sharp(ampliada).toBuffer()
    : await sharp(`${IA2}/01-hero.png`).extract({ left: 880, top: 0, width: 980, height: 809 }).toBuffer()
  await variantes('hero-atletas-v3', buf, [480, 840, 1170], { q: 58, qw: 80 })
}
// as três fotos redondas da seletiva: rostos dos garotos da foto da seletiva
for (const [i, [l, t, z]] of [[40, 385, 230], [405, 235, 250], [615, 330, 210]].entries()) {
  const buf = await sharp(`${IA2}/13-seletiva.png`).extract({ left: l, top: t, width: z, height: z }).toBuffer()
  await variantes(`avatar-${i + 1}`, buf, [96])
}

// ---------------------------------------------------------------- o clube
// grupo à esquerda; o degradê pro azul é CSS
await variantes('clube-v3', `${IA2}/02-clube.png`, [480, 760, 1170], { corte: [0, 0, 0.7, 1] })

// ---------------------------------------------------------------- uniformes: o vestiário
await variantes('vestiario', `${IA}/14-vestiario-fundo.png`, [960, 1672], { q: 44, qw: 68 })

// ---------------------------------------------------------------- o caminho (faixas)
await variantes('etapa-upsl-v3', `${IA2}/03-etapa-upsl.png`, [760, 1280])
await variantes('etapa-opencup', `${IA2}/04-etapa-opencup.png`, [760, 1280])
await variantes('etapa-mls', `${IA2}/05-etapa-mls.png`, [760, 1280])

// ---------------------------------------------------------------- camisas e produtos
// Fotos dos produtos que o Maicon mandou (Recursos Site/produtos), recortadas pelo
// scripts/recortar.mjs em insumos/produto-*-recorte.png. As três camisas vêm no mesmo
// enquadramento: corta as três no MESMO retângulo (a união dos alfas), pra elas trocarem de lugar
// no carrossel sem pular de tamanho.
const caixaAlfa = async (arq) => {
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
  return { caixa: [x0, y0, x1, y1], w: info.width, h: info.height }
}
const camisas = ['marinho', 'branca', 'celeste']
let caixa = null
let dim = null
for (const nome of camisas) {
  const r = await caixaAlfa(`insumos/produto-camisa-${nome}-recorte.png`)
  dim = r
  caixa = caixa ? [Math.min(caixa[0], r.caixa[0]), Math.min(caixa[1], r.caixa[1]), Math.max(caixa[2], r.caixa[2]), Math.max(caixa[3], r.caixa[3])] : r.caixa
}
const [cx0, cy0, cx1, cy1] = [Math.max(0, caixa[0] - 8), Math.max(0, caixa[1] - 8), Math.min(dim.w - 1, caixa[2] + 8), Math.min(dim.h - 1, caixa[3] + 8)]
console.log('caixa das camisas', [cx0, cy0, cx1, cy1].join(', '))
for (const nome of camisas) {
  const buf = await sharp(`insumos/produto-camisa-${nome}-recorte.png`).ensureAlpha().extract({ left: cx0, top: cy0, width: cx1 - cx0, height: cy1 - cy0 }).png().toBuffer()
  await variantes(`camisa-${nome}`, buf, [280, 420, 560, 840], { alfa: true })
  // versão desfocada das laterais do carrossel: troca por opacidade, nunca filter animado
  const borrada = await sharp(buf).resize({ width: 420 }).blur(7).png().toBuffer()
  await variantes(`camisa-${nome}-borrada`, borrada, [420], { alfa: true })
}
for (const nome of ['moletom', 'camiseta-branca', 'camiseta-preta', 'bone-frente']) {
  const buf = await sharp(`insumos/produto-${nome}-recorte.png`).trim({ threshold: 1 }).png().toBuffer()
  await variantes(nome === 'bone-frente' ? 'bone' : nome, buf, [280, 420, 560], { alfa: true })
}

// ---------------------------------------------------------------- detalhes e loja
// detalhes refeitos no ChatGPT em 2026-11-08: escudo e Reebok em TPU, gola com Dry Fit Jacquard, patch Reebok
await variantes('detalhe-escudo', `${IA2}/10a-escudo-tpu.png`, [420, 640], { corte: [0.08, 0.04, 0.84, 0.92] })
await variantes('detalhe-reebok', `${IA2}/10b-reebok-tpu.png`, [420, 640], { corte: [0.08, 0.04, 0.84, 0.92] })
await variantes('detalhe-gola', `${IA2}/10c-gola-jacquard.png`, [420, 640], { corte: [0.08, 0.04, 0.84, 0.92] })
await variantes('detalhe-patch', `${IA2}/10d-patch-reebok.png`, [420, 640], { corte: [0.08, 0.04, 0.84, 0.92] })
await variantes('loja-amigos', `${IA2}/06-loja-amigos.png`, [800, 1280, 1672])

// ---------------------------------------------------------------- fundador
// foto profissional de terno (Recursos Site/maicon/maicon-terno.png), só o rosto, num círculo
await variantes('maicon', 'insumos/maicon-rosto.png', [112, 224, 336])

// ---------------------------------------------------------------- seletiva
await variantes('seletiva-v3', `${IA2}/13-seletiva.png`, [560, 900], { corte: [0, 0.04, 1, 0.9] })

// ---------------------------------------------------------------- marcas
const K = `${R}/site-antigo-khone`
await variantes('escudo', `${K}/logo-escudo-900.webp`, [120, 240, 480], { alfa: true })
await variantes('reebok', `${K}/logo-reebok-branco.webp`, [192], { alfa: true })
// rodapé: logo UFFC (alternativa que o Maicon mandou) e os parceiros, em fundo transparente
await variantes('logo-uffc', 'insumos/logo-uffc.png', [150, 300], { alfa: true, ampliar: false })
await variantes('logo-upsl', 'insumos/logo-upsl.png', [64, 128], { alfa: true })
await variantes('logo-reebok', 'insumos/logo-reebok-branco.png', [128, 256], { alfa: true })

// ---------------------------------------------------------------- banner da loja (/loja/)
await sharp(`${IA2}/07-loja-banner.png`).webp({ quality: 78 }).toFile(path.join(OUT, 'loja-banner-v3.webp'))

// ---------------------------------------------------------------- og e ícones
{
  const og = await sharp(`${R}/ia2/01-hero.png`).resize({ width: 1200, height: 630, fit: 'cover', position: 'right' }).jpeg({ quality: 82, mozjpeg: true }).toBuffer()
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


writeFileSync(path.join(OUT, 'manifesto.json'), JSON.stringify(manifesto, null, 1))
const total = Object.values(manifesto).reduce((s, m) => s + m.kb, 0)
console.log(`ok ${Object.keys(manifesto).length} arquivos, ${total} KB no total`)
