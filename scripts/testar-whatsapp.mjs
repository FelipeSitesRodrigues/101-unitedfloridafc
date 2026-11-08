// Testa os fluxos que terminam no WhatsApp (rodada do Maicon, 2026-11-08): release, inscrição na
// seletiva (categoria escolhida pelo botão, campos obrigatórios, mensagem) e a loja (sacola e
// checkout). Intercepta o window.open e confere o link montado. Servidor na 3411.
// Uso: node scripts/testar-whatsapp.mjs [pasta-de-prints]
import puppeteer from 'puppeteer-core'
const saida = process.argv[2]
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900 })
await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
await p.evaluateOnNewDocument(() => { window.__abertos = []; window.open = (u) => { window.__abertos.push(u); return null } })
const erros = []
p.on('pageerror', (e) => erros.push(e.message))
const ok = (cond, txt) => console.log(cond ? 'ok  ' : 'FALHA', txt)

for (const rota of ['/', '/en/']) {
  await p.goto(`http://localhost:3411${rota}`, { waitUntil: 'networkidle2' })
  // release
  await p.$eval('[data-abrir="release-completo"]', (el) => el.click())
  ok(await p.$eval('#release-completo', (d) => d.open), `${rota} release abre`)
  if (saida && rota === '/') await p.screenshot({ path: `${saida}/release.png` })
  await p.$eval('#release-completo [data-fechar]', (el) => el.click())
  ok(!(await p.$eval('#release-completo', (d) => d.open)), `${rota} release fecha`)
  // inscrição: botão Sub-20 abre com a categoria
  await p.$eval('[data-categoria="Sub-20"]', (el) => el.click())
  ok(await p.$eval('#inscricao', (d) => d.open && d.querySelector('[name=categoria]').value === 'Sub-20'), `${rota} Sub-20 abre a inscrição com a categoria`)
  await p.$eval('[data-inscricao]', (f) => f.requestSubmit())
  ok(await p.$eval('[data-erro]', (e) => !e.hidden), `${rota} inscrição vazia mostra o erro`)
  await p.$eval('[data-inscricao]', (f) => {
    f.nome.value = 'João Teste'; f.nascimento.value = '2008-03-05'; f.cidade.value = 'Niterói'; f.whats.value = '21 99999-0000'; f.posicao.value = 'meia'
    f.requestSubmit()
  })
  const link = await p.evaluate(() => window.__abertos.at(-1) || '')
  const msg = decodeURIComponent(link.split('text=')[1] || '')
  ok(link.startsWith('https://wa.me/5521999581009') && msg.includes('João Teste') && msg.includes('05/03/2008') && msg.includes('Sub-20'), `${rota} inscrição manda pro WhatsApp`)
  if (rota === '/') console.log('     mensagem:', JSON.stringify(msg))
  if (saida && rota === '/') await p.screenshot({ path: `${saida}/inscricao.png` })
}

// loja: adiciona do produto, finaliza no checkout
await p.goto('http://localhost:3411/loja/', { waitUntil: 'networkidle2' })
ok((await p.$$('.card')).length === 7, 'loja mostra 7 produtos')
if (saida) await p.screenshot({ path: `${saida}/loja.png`, fullPage: true })
await p.goto('http://localhost:3411/loja/produto/?p=moletom', { waitUntil: 'networkidle2' })
const pedir = await p.$eval('#pedir-agora', (a) => decodeURIComponent(a.href))
ok(pedir.includes('Moletom United Florida') && pedir.includes('tamanho M'), 'produto: pedir só este')
await p.click('#adicionar')
await p.goto('http://localhost:3411/loja/produto/?p=bone', { waitUntil: 'networkidle2' })
await p.click('#adicionar')
if (saida) await p.screenshot({ path: `${saida}/produto.png` })
await p.goto('http://localhost:3411/loja/checkout/', { waitUntil: 'networkidle2' })
ok((await p.$$('#itens .item')).length === 2, 'checkout com 2 itens')
await p.$eval('#form', (f) => f.requestSubmit())
ok(await p.$eval('#erro', (e) => !e.hidden), 'checkout sem nome mostra erro')
await p.type('[name=nome]', 'Maria Teste')
await p.type('[name=cidade]', 'Rio de Janeiro, RJ')
await p.$eval('#form', (f) => f.requestSubmit())
const pedido = decodeURIComponent((await p.evaluate(() => window.__abertos.at(-1) || '')).split('text=')[1] || '')
ok(pedido.includes('1x Moletom United Florida (tamanho M)') && pedido.includes('Boné Oficial United Florida (tamanho Único)') && pedido.includes('Maria Teste'), 'checkout manda o pedido pro WhatsApp')
console.log('     pedido:', JSON.stringify(pedido))
if (saida) await p.screenshot({ path: `${saida}/checkout.png` })
ok(!erros.length, `sem erro de JS ${erros.join(' | ')}`)
await b.close()
