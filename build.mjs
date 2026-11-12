/**
 * Build do site do United Florida FC. HTML, CSS e JS estático em dist/, em português (/) e em
 * inglês (/en/), a partir de uma fonte só. Base do 0100 (Geomon) com os idiomas do 066 (FIPV).
 *
 *   node build.mjs                          as duas páginas em dist/
 *   node build.mjs --preview 01-hero        só aquela seção (em português), em dist/preview/
 *   node build.mjs --publicar               do zero, sem os previews (antes de subir)
 *
 * Como funciona:
 * - src/index.html é o molde. <!-- @parcial NOME --> puxa src/partials/NOME.html (também de
 *   dentro de um parcial: o _mapa-brasil.html, gerado por scripts/mapa-brasil.mjs).
 * - Idioma: todo elemento com data-i18n="chave" recebe o HTML da chave em src/i18n/en/*.json;
 *   data-i18n-attr="alt:chave;href:chave2" troca atributos. Chave sem tradução fica em português
 *   e aparece no aviso. <a data-idioma="pt|en"> recebe o href e marca o ativo.
 * - CSS: src/css/_*.css primeiro, depois o arquivo de cada seção (mesmo nome do parcial) e 99-*
 *   por último, minificado num <style>. Medidas em px viram rem (1 rem = 16 px em 1440x900; o
 *   _base.css escala a raiz acima de 1200 pela largura e pela altura, o que for menor). Fica em
 *   px: 1 e 2 px, o que estiver na condição de @media e o que for escrito em maiúsculas (14PX).
 * - JS: mesma regra, em src/js, num <script> no fim do <body>. Cada arquivo é um IIFE.
 * - {{cfg.caminho}} puxa do site.config.json; {{ano}} é o ano atual; {{wa:texto}} vira o link do
 *   WhatsApp com a mensagem pronta (a mensagem em inglês vem da tradução do href).
 * - <i data-i="nome" data-w="light" class="..."></i> vira <svg><use> do sprite (Phosphor).
 * - <img data-img="nome" sizes="..." alt="..."> vira <picture> com AVIF e WebP em srcset, a
 *   partir de src/assets/img/manifesto.json (npm run imagens). data-preload gera o preload;
 *   data-img-max limita o src de reserva; data-picture põe classe no <picture>; data-celular=
 *   "nome" põe outra foto (outro corte) abaixo de 768 px; data-so-computador não baixa nada no
 *   celular (gif vazio) e o preload vale só no computador.
 * - <!-- @schema --> recebe o JSON-LD (SportsTeam com o fundador e FAQPage).
 * - Avisa: travessão no texto, img sem alt/width/height, id repetido, âncora sem destino,
 *   marcador que sobrou, chave de tradução faltando e mais de um h1.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, statSync, copyFileSync, renameSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cheerio from 'cheerio'

const RAIZ = path.dirname(fileURLToPath(import.meta.url))
const P = (...a) => path.join(RAIZ, ...a)
const DIST = P('dist')
const cfg = JSON.parse(readFileSync(P('site.config.json'), 'utf8'))
const manifesto = existsSync(P('src/assets/img/manifesto.json')) ? JSON.parse(readFileSync(P('src/assets/img/manifesto.json'), 'utf8')) : {}
const avisos = []
const PRIMEIRO = '00-header'
const ULTIMO = '13-rodape'

// pt é o original (fica na raiz); en sai em /en/
const IDIOMAS = {
  pt: { pasta: '', html: 'pt-BR', og: 'pt_BR' },
  en: { pasta: 'en', html: 'en', og: 'en_US' },
}
const url = (l) => (IDIOMAS[l].pasta ? `/${IDIOMAS[l].pasta}/` : '/')

const argPreview = (() => {
  const i = process.argv.indexOf('--preview')
  return i > -1 ? process.argv[i + 1].split(',').map((s) => s.trim()) : null
})()

// ---------------------------------------------------------------- utilidades
function gravar(arq, conteudo) {
  mkdirSync(path.dirname(arq), { recursive: true })
  const tmp = `${arq}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`
  writeFileSync(tmp, conteudo)
  for (let t = 0; t < 20; t++) {
    try {
      renameSync(tmp, arq)
      return
    } catch (e) {
      if (t === 19) throw e
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50)
    }
  }
}

function copiarPasta(de, para) {
  if (!existsSync(de)) return
  mkdirSync(para, { recursive: true })
  for (const nome of readdirSync(de)) {
    if (nome.startsWith('.') || nome === 'manifesto.json') continue
    const a = path.join(de, nome)
    const b = path.join(para, nome)
    const st = statSync(a)
    if (st.isDirectory()) copiarPasta(a, b)
    else if (!existsSync(b) || statSync(b).size !== st.size || statSync(b).mtimeMs < st.mtimeMs) {
      try {
        copyFileSync(a, b)
      } catch {
        /* outro processo copiando o mesmo arquivo */
      }
    }
  }
}

function lerParcial(nome) {
  const arq = P('src/partials', `${nome}.html`)
  if (!existsSync(arq)) {
    avisos.push(`parcial ausente: ${nome}`)
    return `<!-- parcial ${nome} ainda não existe -->`
  }
  return readFileSync(arq, 'utf8')
}

function arquivos(pasta, ext, so = null) {
  if (!existsSync(P(pasta))) return []
  const todos = readdirSync(P(pasta)).filter((f) => f.endsWith(ext))
  const base = todos.filter((f) => f.startsWith('_')).sort()
  const resto = todos.filter((f) => !f.startsWith('_')).sort().filter((f) => !so || so.includes(f.replace(ext, '')) || f.startsWith('99-'))
  return [...base, ...resto]
}

function juntar(pasta, ext, so) {
  return arquivos(pasta, ext, so)
    .map((f) => {
      const c = readFileSync(P(pasta, f), 'utf8')
      if (ext === '.css') {
        const abre = (c.match(/{/g) || []).length
        const fecha = (c.match(/}/g) || []).length
        if (abre !== fecha) avisos.push(`CSS com chaves desbalanceadas: ${f} (${abre} abre, ${fecha} fecha)`)
      }
      return c
    })
    .join(ext === '.js' ? '\n;\n' : '\n')
}

// px do mockup em rem. Não mexe: dentro da condição de @media/@container, 0 a 2 px e PX maiúsculo.
function pxParaRem(css) {
  const guardadas = []
  const semMedia = css.replace(/@(media|container)[^{]+/g, (m) => {
    guardadas.push(m)
    return `@@${guardadas.length - 1}@@`
  })
  const convertido = semMedia.replace(/(-?\d*\.?\d+)px\b/g, (m, n) => {
    const v = Math.abs(Number(n))
    if (v <= 2) return m
    return `${+(Number(n) / 16).toFixed(4)}rem`
  })
  return convertido.replace(/@@(\d+)@@/g, (_, i) => guardadas[i])
}

function minCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};])\s*/g, '$1')
    .replace(/,\s+/g, ',')
    .replace(/;}/g, '}')
    .trim()
}

function minJs(js) {
  return js
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l))
    .map((l) => l.trim())
    .filter((l) => l !== '')
    .join('\n')
}

function valor(caminho, avisar = true) {
  const v = caminho.split('.').reduce((o, k) => (o == null ? undefined : o[k]), cfg)
  if (v === undefined && avisar) avisos.push(`config sem o caminho: ${caminho}`)
  return v ?? ''
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const wa = (texto) => `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(texto)}`

function traducoes(lang) {
  const dir = P('src/i18n', lang)
  const dic = {}
  if (!existsSync(dir)) return dic
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    try {
      Object.assign(dic, JSON.parse(readFileSync(path.join(dir, f), 'utf8')))
    } catch (e) {
      avisos.push(`JSON inválido em src/i18n/${lang}/${f}: ${e.message}`)
    }
  }
  return dic
}

// ---------------------------------------------------------------- ícones (sprite com <use>)
let usados = new Map()
function icone(nome, peso = 'light', classe = '') {
  const id = `i-${nome}-${peso}`
  if (!usados.has(id)) {
    const arq = P('node_modules/@phosphor-icons/core/assets', peso, `${nome}${peso === 'regular' ? '' : '-' + peso}.svg`)
    if (!existsSync(arq)) {
      avisos.push(`ícone não existe: ${nome} (${peso})`)
      return ''
    }
    const svg = readFileSync(arq, 'utf8')
    const miolo = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/\s+/g, ' ').trim()
    usados.set(id, `<symbol id="${id}" viewBox="0 0 256 256">${miolo}</symbol>`)
  }
  const cls = ['i', classe].filter(Boolean).join(' ')
  return `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#${id}"/></svg>`
}

// ---------------------------------------------------------------- imagens (<picture> com AVIF e WebP)
function versoes(nome, ext) {
  return Object.entries(manifesto)
    .map(([arq, m]) => ({ arq, m, w: Number((arq.match(new RegExp(`^${nome}-(\\d+)\\.${ext}$`)) || [])[1]) }))
    .filter((v) => v.w)
    .sort((a, b) => a.w - b.w)
}
const srcset = (vs) => vs.map((v) => `/assets/img/${v.arq} ${v.m.w}w`).join(', ')
const attr = (s, nome) => (s.match(new RegExp(`\\s${nome}="([^"]*)"`)) || [])[1]
const temAttr = (s, nome) => new RegExp(`\\s${nome}(\\s|=|$)`).test(s)
const semAttr = (s, ...nomes) => nomes.reduce((t, n) => t.replace(new RegExp(`\\s${n}(="[^"]*")?(?=[\\s>/]|$)`, 'g'), ''), s)
let preloads = []
const CELULAR = '(max-width: 47.99em)'
const COMPUTADOR = '(min-width: 48em)'

function imagens(html) {
  return html.replace(/<img\b([^>]*?)\sdata-img="([\w-]+)"([^>]*)>/g, (tag, antes, nome, depois) => {
    let attrs = antes + depois
    const sizes = attr(attrs, 'sizes') || '100vw'
    const max = Number(attr(attrs, 'data-img-max') || Infinity)
    const classePicture = attr(attrs, 'data-picture')
    const preload = temAttr(attrs, 'data-preload')
    const celular = attr(attrs, 'data-celular')
    const soComputador = temAttr(attrs, 'data-so-computador')
    const sizesCelular = attr(attrs, 'data-sizes-celular') || '100vw'
    attrs = semAttr(attrs, 'data-img-max', 'data-picture', 'data-preload', 'sizes', 'data-celular', 'data-sizes-celular', 'data-so-computador')
    const vw = versoes(nome, 'webp')
    const va = versoes(nome, 'avif')
    if (!vw.length) {
      avisos.push(`data-img sem arquivo no manifesto: ${nome}`)
      return tag.replace(/\sdata-img="[\w-]+"/, ' src="data:," width="16" height="9"')
    }
    const fontes = []
    // só no computador: no celular a <picture> escolhe um gif vazio e não baixa nada
    if (soComputador) fontes.push(`<source media="${CELULAR}" srcset="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">`)
    const media = celular || soComputador ? ` media="${COMPUTADOR}"` : ''
    if (celular) {
      const cw = versoes(celular, 'webp')
      const ca = versoes(celular, 'avif')
      if (!cw.length) avisos.push(`data-celular sem arquivo no manifesto: ${celular}`)
      const c0 = cw[cw.length - 1]
      if (ca.length) fontes.push(`<source type="image/avif" media="${CELULAR}" srcset="${srcset(ca)}" sizes="${sizesCelular}"${c0 ? ` width="${c0.m.w}" height="${c0.m.h}"` : ''}>`)
      if (cw.length) fontes.push(`<source type="image/webp" media="${CELULAR}" srcset="${srcset(cw)}" sizes="${sizesCelular}" width="${c0.m.w}" height="${c0.m.h}">`)
      if (preload && ca.length) preloads.push(`<link rel="preload" as="image" type="image/avif" media="${CELULAR}" imagesrcset="${srcset(ca)}" imagesizes="${sizesCelular}" fetchpriority="high">`)
    }
    if (va.length) fontes.push(`<source type="image/avif"${media} srcset="${srcset(va)}" sizes="${sizes}">`)
    const principal = [...vw].reverse().find((v) => v.w <= max) || vw[0]
    const img = `<img src="/assets/img/${principal.arq}" srcset="${srcset(vw)}" sizes="${sizes}" width="${principal.m.w}" height="${principal.m.h}"${attrs}>`
    if (preload) {
      const lista = va.length ? va : vw
      preloads.push(`<link rel="preload" as="image" type="image/${va.length ? 'avif' : 'webp'}"${celular || soComputador ? ` media="${COMPUTADOR}"` : ''} imagesrcset="${srcset(lista)}" imagesizes="${sizes}" fetchpriority="high">`)
    }
    return `<picture${classePicture ? ` class="${classePicture}"` : ''}>${fontes.join('')}${img}</picture>`
  })
}

// ---------------------------------------------------------------- palavras e letras
// Elemento com data-palavras (efeito Split Text do React Bits): cada palavra vira
// <span class="pw"><span class="pw__i"> e cada letra dela um <span class="pc"> com --c em
// sequência no título inteiro; a palavra não quebra no meio. Tag dentro (br, em) passa direto.
// Como o leitor de tela soletraria as letras soltas, o texto inteiro vai no aria-label.
function palavras(html) {
  return html.replace(/<(h1|h2|h3|p)(\s[^>]*?\bdata-palavras\b[^>]*)>([\s\S]*?)<\/\1>/g, (_, nome, attrs, miolo) => {
    const rotulo = miolo.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
    let c = 0
    const letras = (w) => (nome === 'p' ? [w] : w.match(/&[^;\s]+;|./gsu)).map((l) => `<span class="pc" style="--c:${c++}">${l}</span>`).join('')
    const out = miolo
      .split(/(<[^>]+>)/)
      .map((parte) => (parte.startsWith('<') ? parte : parte.replace(/\S+/g, (w) => `<span class="pw"><span class="pw__i">${letras(w)}</span></span>`)))
      .join('')
    const aria = nome === 'p' || /\baria-label=/.test(attrs) ? '' : ` aria-label="${rotulo}"`
    // o tradutor do Chrome traduz letra por letra e embaralha o título ("The Brumzeu leuumn club"):
    // o site já tem o inglês próprio em /en/, então o título quebrado em letras não é traduzido
    const naoTraduzir = nome === 'p' ? '' : ' translate="no"'
    return `<${nome}${attrs}${aria}${naoTraduzir}>${out}</${nome}>`
  })
}

// ---------------------------------------------------------------- dados estruturados
function schema(html, lang) {
  const base = (cfg.dominio || '').replace(/\/$/, '')
  const clube = {
    '@type': 'SportsTeam',
    '@id': `${base}/#clube`,
    name: 'United Florida FC',
    sport: 'Soccer',
    description: lang === 'en' ? cfg.descricaoEn : cfg.descricao,
    foundingDate: '2026',
    logo: `${base}/assets/img/escudo-480.webp`,
    image: `${base}/assets/img/og.jpg`,
    location: { '@type': 'Place', name: 'Orlando, Florida', address: { '@type': 'PostalAddress', addressLocality: 'Orlando', addressRegion: 'FL', addressCountry: 'US' } },
    founder: { '@type': 'Person', name: 'Maicon Vilela', jobTitle: lang === 'en' ? 'President and founder' : 'Presidente e fundador' },
    memberOf: { '@type': 'SportsOrganization', name: 'United Premier Soccer League (UPSL)' },
    telephone: cfg.telefoneLink,
    email: cfg.email,
    sameAs: Object.values(cfg.redes),
  }
  if (base) clube.url = `${base}${url(lang)}`
  const $ = cheerio.load(html)
  const perguntas = $('#perguntas .pergunta')
    .map((_, d) => ({
      '@type': 'Question',
      name: $(d).find('.pergunta__q').text().replace(/\s+/g, ' ').trim(),
      acceptedAnswer: { '@type': 'Answer', text: $(d).find('.pergunta__r').text().replace(/\s+/g, ' ').trim() },
    }))
    .get()
    .filter((q) => q.name && q.acceptedAnswer.text)
  const grafo = [clube]
  if (perguntas.length) grafo.push({ '@type': 'FAQPage', '@id': `${base}${url(lang)}#perguntas`, mainEntity: perguntas })
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': grafo })}</script>`
}

// ---------------------------------------------------------------- montagem
function montarBase(parciais) {
  let html = readFileSync(P('src/index.html'), 'utf8')
  if (parciais) {
    const header = parciais.includes(PRIMEIRO) ? `<!-- @parcial ${PRIMEIRO} -->` : ''
    const rodape = parciais.includes(ULTIMO) ? `<!-- @parcial ${ULTIMO} -->` : ''
    const meio = parciais
      .filter((n) => n !== PRIMEIRO && n !== ULTIMO)
      .map((n) => `<!-- @parcial ${n} -->`)
      .join('\n')
    html = html.replace(new RegExp(`<!--\\s*@parcial ${PRIMEIRO}\\s*-->[\\s\\S]*<!--\\s*@parcial ${ULTIMO}\\s*-->`), `${header}\n  <main id="conteudo">\n${meio}\n  </main>\n${rodape}`)
  }
  for (let n = 0; n < 4 && /<!--\s*@parcial\s/.test(html); n++) html = html.replace(/<!--\s*@parcial\s+([\w-]+)\s*-->/g, (_, nome) => lerParcial(nome))
  return html
}

function idioma(html, lang, dic, faltando) {
  const $ = cheerio.load(html, { decodeEntities: false })
  $('html').attr('lang', IDIOMAS[lang].html)
  if (lang !== 'pt') {
    $('[data-i18n]').each((_, el) => {
      const k = $(el).attr('data-i18n')
      if (k in dic) $(el).html(dic[k])
      else faltando.add(`${lang}:${k}`)
    })
    $('[data-i18n-attr]').each((_, el) => {
      for (const par of $(el).attr('data-i18n-attr').split(';')) {
        const [a, k] = par.split(':').map((s) => s.trim())
        if (!a || !k) continue
        if (k in dic) $(el).attr(a, dic[k])
        else faltando.add(`${lang}:${k}`)
      }
    })
    if (dic['meta.title']) $('title').text(dic['meta.title'])
    if (dic['meta.description']) $('meta[name="description"]').attr('content', dic['meta.description'])
    if (dic['meta.ogTitle']) $('meta[property="og:title"]').attr('content', dic['meta.ogTitle'])
    if (dic['meta.ogDescription']) $('meta[property="og:description"]').attr('content', dic['meta.ogDescription'])
    if (dic['meta.ogAlt']) $('meta[property="og:image:alt"]').attr('content', dic['meta.ogAlt'])
  }
  $('[data-i18n]').removeAttr('data-i18n')
  $('[data-i18n-attr]').removeAttr('data-i18n-attr')
  $('[data-idioma]').each((_, el) => {
    const alvo = $(el).attr('data-idioma')
    $(el).attr('href', url(alvo)).attr('hreflang', IDIOMAS[alvo].html)
    if (alvo === lang) $(el).attr('aria-current', 'true').addClass('ativo')
    else $(el).removeAttr('aria-current').removeClass('ativo')
  })
  const base = (cfg.dominio || '').replace(/\/$/, '')
  const outros = Object.keys(IDIOMAS).filter((l) => l !== lang)
  const meta = [`<meta property="og:locale" content="${IDIOMAS[lang].og}">`, ...outros.map((l) => `<meta property="og:locale:alternate" content="${IDIOMAS[l].og}">`)]
  if (base) {
    meta.unshift(
      `<link rel="canonical" href="${base}${url(lang)}">`,
      ...Object.keys(IDIOMAS).map((l) => `<link rel="alternate" hreflang="${IDIOMAS[l].html}" href="${base}${url(l)}">`),
      `<link rel="alternate" hreflang="x-default" href="${base}/">`,
      `<meta property="og:url" content="${base}${url(lang)}">`,
      `<meta property="og:image" content="${base}/assets/img/og.jpg">`,
    )
  } else meta.push('<meta property="og:image" content="/assets/img/og.jpg">')
  return $.html().replace('<!-- @meta-idioma -->', meta.join('\n  '))
}

function finalizar(html, lang, parciais) {
  usados = new Map()
  preloads = []
  html = palavras(html)
  html = html.replace('<!-- @js -->', () => `<script>${minJs(juntar('src/js', '.js', parciais))}</script>`)
  html = html.replace('<!-- @css -->', () => `<style>${minCss(pxParaRem(juntar('src/css', '.css', parciais)))}</style>`)
  html = html.replace(/<i data-i="([\w-]+)"(?: data-w="(\w+)")?(?: class="([^"]*)")?><\/i>/g, (_, nome, peso, classe) => icone(nome, peso || 'light', classe || ''))
  html = html.replace(/\{\{wa:([^}]+)\}\}/g, (_, t) => esc(wa(t.trim().replace(/&amp;/g, '&'))))
  html = html.replace(/\{\{cfg\.([\w.]+)\}\}/g, (_, c) => esc(valor(c)))
  html = html.replace(/\{\{ano\}\}/g, String(new Date().getFullYear()))
  html = html.replace('<!-- @schema -->', () => schema(html, lang))
  html = imagens(html)
  html = html.replace('<!-- @preload -->', () => preloads.join('\n  '))
  html = html.replace('<!-- @sprite -->', () => `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" width="0" height="0" style="position:absolute;overflow:hidden">${[...usados.values()].join('')}</svg>`)
  html = html.replace('<!-- @robots -->', cfg.indexar ? '<meta name="robots" content="index, follow, max-image-preview:large">' : '<meta name="robots" content="noindex, nofollow">')
  return html
}

function verificar(html, rotulo) {
  const $ = cheerio.load(html)
  $('script, style').remove()
  const texto = $('body').text()
  const tracos = texto.match(/.{0,30}[—–].{0,30}/g)
  if (tracos) avisos.push(`[${rotulo}] travessão no texto (regra da casa): ${tracos.slice(0, 4).map((s) => JSON.stringify(s.trim())).join(' | ')}`)
  if (/credialta/i.test(texto)) avisos.push(`[${rotulo}] "Credialta" no texto do site (proibido)`)
  const sobrou = html.match(/\{\{[^}]+\}\}/g)
  if (sobrou) avisos.push(`[${rotulo}] marcadores sem valor: ${[...new Set(sobrou)].join(', ')}`)
  $('img').each((_, el) => {
    const src = ($(el).attr('src') || '?').slice(0, 60)
    if ($(el).attr('alt') === undefined) avisos.push(`[${rotulo}] img sem alt: ${src}`)
    if (!$(el).attr('width') || !$(el).attr('height')) avisos.push(`[${rotulo}] img sem width/height (salto de layout): ${src}`)
  })
  const ids = {}
  $('[id]').each((_, el) => {
    const id = $(el).attr('id')
    ids[id] = (ids[id] || 0) + 1
  })
  for (const [id, n] of Object.entries(ids)) if (n > 1) avisos.push(`[${rotulo}] id repetido: #${id} (${n}x)`)
  if (!argPreview)
    $('a[href^="#"]').each((_, el) => {
      const alvo = $(el).attr('href').slice(1)
      if (alvo && !ids[alvo]) avisos.push(`[${rotulo}] âncora sem destino: #${alvo}`)
    })
  if (!argPreview && $('h1').length !== 1) avisos.push(`[${rotulo}] ${$('h1').length} h1 na página (precisa ser 1)`)
}

// ---------------------------------------------------------------- execução
if (process.argv.includes('--publicar')) rmSync(DIST, { recursive: true, force: true })
copiarPasta(P('src/assets'), path.join(DIST, 'assets'))
copiarPasta(P('src/raiz'), DIST)

const kb = (s) => `${(Buffer.byteLength(s) / 1024).toFixed(1)} KB`
const faltando = new Set()
if (!argPreview) {
  const base = montarBase(null)
  const saidas = []
  for (const l of Object.keys(IDIOMAS)) {
    const html = finalizar(idioma(base, l, l === 'pt' ? {} : traducoes(l), faltando), l, null)
    verificar(html, l)
    gravar(path.join(DIST, IDIOMAS[l].pasta, 'index.html'), html)
    saidas.push(`dist/${IDIOMAS[l].pasta ? IDIOMAS[l].pasta + '/' : ''}index.html ${kb(html)}`)
  }
  const dom = (cfg.dominio || '').replace(/\/$/, '')
  gravar(path.join(DIST, 'robots.txt'), cfg.indexar ? `User-agent: *\nAllow: /\nDisallow: /preview/\n${dom ? `Sitemap: ${dom}/sitemap.xml\n` : ''}` : 'User-agent: *\nDisallow: /\n')
  if (dom && cfg.indexar)
    gravar(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${Object.keys(IDIOMAS).map((u) => `  <url><loc>${dom}${url(u)}</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>${Object.keys(IDIOMAS).map((l) => `<xhtml:link rel="alternate" hreflang="${IDIOMAS[l].html}" href="${dom}${url(l)}"/>`).join('')}</url>`).join('\n')}\n</urlset>\n`)
  if (!dom) avisos.push('dominio vazio no site.config.json: sem canonical, sem hreflang absoluto e og:image relativo')
  if (process.argv.includes('--publicar')) rmSync(path.join(DIST, 'preview'), { recursive: true, force: true })
  console.log(`ok ${saidas.join(', ')}`)
} else {
  const nome = argPreview.join('+')
  const html = finalizar(idioma(montarBase(argPreview), 'pt', {}, faltando), 'pt', argPreview)
  verificar(html, `preview ${nome}`)
  gravar(path.join(DIST, `preview/${nome}.html`), html)
  console.log(`ok /preview/${nome}.html ${kb(html)}`)
}
if (faltando.size) avisos.push(`tradução faltando (${faltando.size}): ${[...faltando].slice(0, 12).join(', ')}${faltando.size > 12 ? '...' : ''}`)
if (avisos.length) console.log(`AVISOS:\n  ${[...new Set(avisos)].join('\n  ')}`)
