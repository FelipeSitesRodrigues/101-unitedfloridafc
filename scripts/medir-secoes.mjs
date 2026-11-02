// Mede a altura do conteúdo (sem o padding) de cada seção com content-visibility, em rem, nas três
// larguras do 99-desempenho.css (1440, 1024, 390), pra atualizar o contain-intrinsic-size depois de
// mudar o layout. Uso: node scripts/medir-secoes.mjs   (servidor na 3411)
import puppeteer from 'puppeteer-core'
const SECOES = ['clube', 'caminho', 'uniformes', 'loja', 'fundador', 'peneira', 'franquias', 'perguntas', 'cta', 'rodape']
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--hide-scrollbars'] })
for (const [w, h] of [[1440, 900], [1024, 768], [390, 844]]) {
  const p = await b.newPage()
  await p.setViewport({ width: w, height: h })
  await p.goto('http://localhost:3411/', { waitUntil: 'networkidle2' })
  const r = await p.evaluate(async (secoes) => {
    document.documentElement.classList.add('cv-pronto')
    await document.fonts.ready
    await new Promise((ok) => setTimeout(ok, 400))
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
    return secoes.map((s) => {
      const el = document.querySelector('.' + s)
      const cs = getComputedStyle(el)
      const alt = el.getBoundingClientRect().height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
      return `.${s} { contain-intrinsic-size: auto ${(alt / rem).toFixed(1)}rem; }`
    })
  }, SECOES)
  console.log(`/* ${w} */\n` + r.join('\n'))
  await p.close()
}
await b.close()
