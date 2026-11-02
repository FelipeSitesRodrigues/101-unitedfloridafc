// Print de uma seção sem o menu fixo e sem o botão do WhatsApp, pra anexar no ChatGPT.
// Uso: node scripts/print-secao-limpa.mjs "#uniformes" saida.png   (servidor na 3411)
import puppeteer from 'puppeteer-core'
const [seletor, saida] = process.argv.slice(2)
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--hide-scrollbars', '--force-prefers-reduced-motion'] })
const p = await b.newPage()
await p.setViewport({ width: 1920, height: 1080 })
await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
await p.goto('http://localhost:3411/', { waitUntil: 'networkidle2' })
await p.evaluate(async (s) => {
  document.documentElement.style.scrollBehavior = 'auto'
  document.documentElement.classList.add('cv-pronto')
  const st = document.createElement('style')
  st.textContent = 'header.topo,.pular,[class*=whats]{display:none!important}'
  document.head.append(st)
  const el = document.querySelector(s)
  el.scrollIntoView()
  await new Promise((r) => setTimeout(r, 1500))
  document.querySelectorAll('img').forEach((i) => (i.loading = 'eager'))
  await new Promise((r) => setTimeout(r, 1500))
}, seletor)
const r = await p.evaluate((s) => { const e = document.querySelector(s).getBoundingClientRect(); return { x: 0, y: e.top + scrollY, width: 1920, height: e.height } }, seletor)
await p.screenshot({ path: saida, clip: r, captureBeyondViewport: true })
await b.close()
console.log('ok', r.height)
