// Fotos de jogador da página do produto, recortadas do banner da loja e do mockup aprovado.
// Provisórias da prévia: a resolução é baixa pra foto principal; gerar ensaio próprio antes de publicar.
// Uso: node scripts/loja-fotos.mjs   (o processar-imagens.mjs chama no fim, porque ele limpa a pasta)
import sharp from 'sharp'
const D = '../0101 - United Florida FC'
const BANNER = `${D}/Recursos Site/ia/15-loja-banner.png`
const cortes = {
  marinho: [`${D}/mockup/pagina-produto-v1-aprovado.png`, { left: 156, top: 138, width: 422, height: 482 }],
  branca: [BANNER, { left: 742, top: 300, width: 250, height: 286 }],
  celeste: [BANNER, { left: 1118, top: 205, width: 190, height: 217 }],
}
for (const [nome, [arq, c]] of Object.entries(cortes)) {
  await sharp(arq).extract(c).resize({ width: 760, kernel: 'lanczos3' }).sharpen({ sigma: 0.8 }).webp({ quality: 80 }).toFile(`src/assets/img/produto-${nome}.webp`)
}
console.log('ok fotos da loja')
