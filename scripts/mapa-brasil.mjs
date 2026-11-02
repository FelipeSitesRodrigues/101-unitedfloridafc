/**
 * Mapa das franquias: os estados do Brasil em linha pontilhada (insumos/brasil-estados.geojson,
 * do click_that_hood da Code for America), as cidades acesas e as rotas curvas até Orlando.
 * Gera src/partials/_mapa-brasil.html, que o 10-franquias.html puxa com @parcial.
 *
 * Projeção equirretangular com o cosseno da latitude do meio (o Brasil não fica achatado) e
 * Douglas-Peucker pra o SVG não passar de ~40 KB.
 * Uso: node scripts/mapa-brasil.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'

const geo = JSON.parse(readFileSync('insumos/brasil-estados.geojson', 'utf8'))
const LAT0 = -15
const K = Math.cos((LAT0 * Math.PI) / 180)
const ESCALA = 13.2
const LON_MIN = -74.2
const LAT_MAX = 5.4
const proj = ([lon, lat]) => [(lon - LON_MIN) * K * ESCALA, (LAT_MAX - lat) * ESCALA]

// Douglas-Peucker
function simplificar(pts, tol) {
  if (pts.length < 3) return pts
  const [a, b] = [pts[0], pts[pts.length - 1]]
  let max = 0
  let idx = 0
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    // anel fechado (a = b): a distância vira a distância até o ponto a
    const len = Math.hypot(dx, dy)
    const d = len ? Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len : Math.hypot(p[0] - a[0], p[1] - a[1])
    if (d > max) {
      max = d
      idx = i
    }
  }
  if (max <= tol) return [a, b]
  return [...simplificar(pts.slice(0, idx + 1), tol).slice(0, -1), ...simplificar(pts.slice(idx), tol)]
}

const f = (n) => +n.toFixed(1)
let xmax = 0
let ymax = 0
const caminhos = []
for (const ft of geo.features) {
  const polis = ft.geometry.type === 'Polygon' ? [ft.geometry.coordinates] : ft.geometry.coordinates
  let d = ''
  for (const poli of polis) {
    const anel = poli[0].map(proj)
    const s = simplificar(anel, 0.9)
    if (s.length < 4) continue
    for (const [x, y] of s) {
      xmax = Math.max(xmax, x)
      ymax = Math.max(ymax, y)
    }
    d += 'M' + s.map(([x, y]) => `${f(x)} ${f(y)}`).join('L') + 'Z'
  }
  if (d) caminhos.push(d)
}

const W = Math.ceil(xmax + 150)
const H = Math.ceil(ymax + 10)
const cidades = [
  { nome: 'Niterói', lon: -43.1034, lat: -22.8832, lado: 'dir', dy: -2.2 },
  { nome: 'Rio de Janeiro', lon: -43.1729, lat: -22.9068, lado: 'dir', dy: 0.9 },
  { nome: 'São Paulo', lon: -46.6333, lat: -23.5505, lado: 'esq', dy: 2.2 },
].map((c) => ({ ...c, xy: proj([c.lon, c.lat]) }))
const sua = { xy: proj([-39.6, -8.6]) }
const orlando = [W - 40, -6]

// rota curva: sai da cidade, sobe abrindo pra direita e chega em Orlando por cima
const rota = ([x, y]) => {
  const [ox, oy] = orlando
  const c1 = [x + (ox - x) * 0.15 + 60, y - (y - oy) * 0.45]
  const c2 = [ox - 10, oy + (y - oy) * 0.35]
  return `M${f(x)} ${f(y)}C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(ox)} ${f(oy)}`
}

const pct = ([x, y]) => `--x:${f((x / W) * 100)}%;--y:${f((y / H) * 100)}%`
const html = `<div class="mapa" aria-hidden="true">
  <svg class="mapa__svg" viewBox="0 -12 ${W} ${H + 12}" preserveAspectRatio="xMidYMid meet" focusable="false">
    <g class="mapa__estados">${caminhos.map((d) => `<path d="${d}"/>`).join('')}</g>
    <g class="mapa__rotas">${[...cidades.map((c) => c.xy), sua.xy].map((xy) => `<path d="${rota(xy)}"/>`).join('')}</g>
    <g class="mapa__pontos">${cidades.map((c) => `<circle cx="${f(c.xy[0])}" cy="${f(c.xy[1])}" r="4.5"/>`).join('')}</g>
  </svg>
${cidades.map((c) => `  <span class="mapa__rotulo${c.lado === 'esq' ? ' mapa__rotulo--esq' : ''}" style="${pct([c.xy[0], c.xy[1]])};--dy:${c.dy}">${c.nome}</span>`).join('\n')}
  <span class="mapa__sua" style="${pct(sua.xy)}"><span class="mapa__anel"></span><span class="mapa__sua-rotulo" data-i18n="franquias.sua">Sua cidade?</span></span>
  <span class="mapa__orlando" style="${pct([orlando[0], orlando[1] + 12])}"><img src="/assets/img/bandeiras/eua.svg" alt="" width="40" height="40" loading="lazy" decoding="async">Orlando</span>
</div>
`
writeFileSync('src/partials/_mapa-brasil.html', html)
console.log(`ok src/partials/_mapa-brasil.html ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB, viewBox ${W}x${H}`)
