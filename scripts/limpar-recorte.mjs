// Limpa o recorte do técnico com a lâmina pra ir direto no fundo claro, sem cartão:
// - o topo do chapéu vem cortado reto da foto do ChatGPT: vira uma copa arredondada (elipse);
// - a borda trazia o azul do céu: a cor de cada pixel de borda vira a cor do miolo mais próximo
//   (média borrada só dos pixels sólidos) e o alfa encolhe um pouco.
// Uso: node scripts/limpar-recorte.mjs insumos/lamina-recorte.png insumos/lamina-recorte-limpo.png
import sharp from 'sharp'
const [entrada, saida] = process.argv.slice(2)
const { data, info } = await sharp(entrada).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: W, height: H } = info
const n = W * H

// copa do chapéu: elipse que encosta nos lados medidos da copa (y 0 a 40), 2 px de transição
const [cx, cy, rx, ry] = [422, 55, 162, 55]
for (let y = 0; y < cy; y++) {
  for (let x = 0; x < W; x++) {
    const d = Math.hypot((x - cx) / rx, (y - cy) / ry)
    const t = Math.min(1, Math.max(0, ((1 - d) * rx) / 2))
    const i = (y * W + x) * 4 + 3
    data[i] = Math.round(data[i] * t)
  }
}

// cor de borda: média borrada dos pixels sólidos (alfa >= 250), três canais por vez
const solido = Buffer.alloc(n * 3)
const peso = Buffer.alloc(n * 3)
for (let p = 0; p < n; p++) {
  const s = data[p * 4 + 3] >= 250
  for (let c = 0; c < 3; c++) {
    solido[p * 3 + c] = s ? data[p * 4 + c] : 0
    peso[p * 3 + c] = s ? 255 : 0
  }
}
const borrar = (buf) => sharp(buf, { raw: { width: W, height: H, channels: 3 } }).blur(4).raw().toBuffer()
const [mP, mW] = await Promise.all([borrar(solido), borrar(peso)])
for (let p = 0; p < n; p++) {
  const a = data[p * 4 + 3]
  if (a > 0 && a < 250 && mW[p * 3] > 0) {
    for (let c = 0; c < 3; c++) data[p * 4 + c] = Math.min(255, Math.round((mP[p * 3 + c] * 255) / mW[p * 3 + c]))
  }
  // alfa encolhe ~1 px na borda; onde é 0, a cor também zera (não esconde cor velha)
  const a2 = Math.max(0, Math.min(255, Math.round(((a - 30) * 255) / 225)))
  data[p * 4 + 3] = a2
  if (a2 === 0) data[p * 4] = data[p * 4 + 1] = data[p * 4 + 2] = 0
}
await sharp(data, { raw: info }).png().toFile(saida)
console.log('ok', saida, W, H)
