// Loja virtual: produtos, sacola (fica no navegador) e cabeçalho comum das páginas da loja.
// Rodada do Maicon (2026-11-08): sem pagamento no site. A sacola vira uma mensagem no WhatsApp do
// clube, que confirma valor, frete e pagamento. Preço ainda não definido: o campo preco fica null
// e a loja mostra "Pedido pelo WhatsApp" no lugar (quando o Maicon mandar, é só preencher).
const IMG = '/assets/img/'
const WHATSAPP = '5521972061009' // o mesmo do site.config.json
const PRODUTOS = {
  marinho: { nome: 'Camisa 1 · Marinho 2027', a: 'Camisa 1', b: 'Marinho 2027', preco: null, cat: 'camisa', cor: 'Marinho', hex: '#0E2664', foto: 'camisa-marinho-560', desc: 'A camisa titular da estreia na UPSL. Dry Fit Jacquard com estampa tom sobre tom, gola polo retrô com friso branco duplo, escudo e logo Reebok em TPU emborrachado.' },
  celeste: { nome: 'Camisa 2 · Celeste 2027', a: 'Camisa 2', b: 'Celeste 2027', preco: null, cat: 'camisa', cor: 'Celeste', hex: '#9CCBEB', foto: 'camisa-celeste-560', desc: 'A camisa reserva da temporada de estreia. Celeste com gola polo e punhos marinho de friso branco, escudo e logo Reebok em TPU emborrachado.' },
  branca: { nome: 'Camisa 3 · Branca 2027', a: 'Camisa 3', b: 'Branca 2027', preco: null, cat: 'camisa', cor: 'Branca', hex: '#FFFFFF', foto: 'camisa-branca-560', desc: 'A camisa alternativa do clube. Branca com gola polo e punhos marinho de friso branco, escudo e logo Reebok em TPU emborrachado.' },
  moletom: { nome: 'Moletom United Florida', a: 'Moletom', b: 'United Florida', preco: null, cat: 'agasalho', foto: 'moletom-560', desc: 'O agasalho oficial do clube: moletom azul com capuz e bolso canguru, escudo no peito e logo Reebok.' },
  'camiseta-branca': { nome: 'Camiseta Extreme Time Branca', a: 'Camiseta', b: 'Extreme Time Branca', preco: null, cat: 'camiseta', foto: 'camiseta-branca-560', desc: 'Camiseta branca de algodão com a arte Extreme Time United Florida FC em grafite azul e preto.' },
  'camiseta-preta': { nome: 'Camiseta Extreme Time Preta', a: 'Camiseta', b: 'Extreme Time Preta', preco: null, cat: 'camiseta', foto: 'camiseta-preta-560', desc: 'Camiseta preta de algodão com a arte Extreme Time United Florida FC em grafite branco e azul.' },
  bone: { nome: 'Boné Oficial United Florida', a: 'Boné Oficial', b: 'United Florida', preco: null, cat: 'bone', foto: 'bone-560', desc: 'O boné oficial do clube, em marinho, com o escudo na frente e ajuste traseiro.' },
}
const TAMANHOS = ['P', 'M', 'G', 'GG', 'XGG']
const temTamanho = (p) => p.cat !== 'bone'
const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const precoTexto = (p, qtd = 1) => (p.preco == null ? 'Pedido pelo WhatsApp' : brl(p.preco * qtd))

// sacola: memória do navegador; sem acesso a ela, vale só até trocar de página
let memoria = []
const ler = () => {
  try {
    const itens = JSON.parse(localStorage.getItem('ufc-sacola') || '[]')
    return itens.filter((i) => Object.hasOwn(PRODUTOS, i.id) && i.qtd > 0)
  } catch { return memoria }
}
const gravar = (itens) => {
  memoria = itens
  try { localStorage.setItem('ufc-sacola', JSON.stringify(itens)) } catch {}
  document.dispatchEvent(new Event('sacola'))
}
const adicionar = (id, tam) => {
  const itens = ler()
  const achado = itens.find((i) => i.id === id && i.tam === tam)
  if (achado) achado.qtd++
  else itens.push({ id, tam, qtd: 1 })
  gravar(itens)
  abrirSacola(true)
}
const contagem = (itens) => itens.reduce((s, i) => s + i.qtd, 0)
const comPreco = (itens) => itens.every((i) => PRODUTOS[i.id].preco != null)
const subtotal = (itens) => itens.reduce((s, i) => s + (PRODUTOS[i.id].preco || 0) * i.qtd, 0)
const ICONE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>'
const ZAP = '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M187.58 144.84l-32-16a8 8 0 0 0-8 .5l-14.69 9.8a40.55 40.55 0 0 1-16-16l9.8-14.69a8 8 0 0 0 .5-8l-16-32A8 8 0 0 0 104 64a40 40 0 0 0-40 40 88.1 88.1 0 0 0 88 88 40 40 0 0 0 40-40 8 8 0 0 0-4.42-7.16ZM152 176a72.08 72.08 0 0 1-72-72 24 24 0 0 1 19.29-23.54l11.48 23L101 118a8 8 0 0 0-.73 7.51 56.47 56.47 0 0 0 30.15 30.15A8 8 0 0 0 138 155l14.61-9.74 23 11.48A24 24 0 0 1 152 176ZM128 24a104 104 0 0 0-91.82 152.88l-11.35 34.05a16 16 0 0 0 20.24 20.24l34.05-11.35A104 104 0 1 0 128 24Zm0 192a87.87 87.87 0 0 1-44.06-11.81 8 8 0 0 0-4-1.08 7.85 7.85 0 0 0-2.53.42L40 216l12.47-37.4a8 8 0 0 0-.66-6.54A88 88 0 1 1 128 216Z"/></svg>'

const itemHtml = (i, comControles) => {
  const p = PRODUTOS[i.id]
  return `<div class="item"><img src="${IMG}${p.foto}.webp" alt="" width="78" height="84"><div><h3>${p.nome}</h3><small>Tamanho: ${i.tam}</small>${comControles
    ? `<span class="qtd"><button type="button" data-menos="${i.id}|${i.tam}" aria-label="Diminuir">−</button>${i.qtd}<button type="button" data-mais="${i.id}|${i.tam}" aria-label="Aumentar">+</button></span>`
    : `<small>Quantidade: ${i.qtd}</small>`}</div><div>${p.preco == null ? '' : `<span class="item__preco">${brl(p.preco * i.qtd)}</span>`}${comControles ? `<button type="button" class="remover" data-tirar="${i.id}|${i.tam}">Remover</button>` : ''}</div></div>`
}

// pedido em texto pro WhatsApp; dados: { nome, cidade, cep, obs }
function mensagemPedido(itens, dados = {}) {
  const linhas = itens.map((i) => `• ${i.qtd}x ${PRODUTOS[i.id].nome} (tamanho ${i.tam})`)
  const extra = [
    dados.nome && `*Nome:* ${dados.nome}`,
    dados.cidade && `*Cidade:* ${dados.cidade}`,
    dados.cep && `*CEP:* ${dados.cep}`,
    dados.obs && `*Observação:* ${dados.obs}`,
  ].filter(Boolean)
  return `Olá! Vim pela loja do site do United Florida FC e quero fazer este pedido:\n\n${linhas.join('\n')}${extra.length ? `\n\n${extra.join('\n')}` : ''}\n\nPode me passar o valor, o frete e a forma de pagamento?`
}
const linkPedido = (itens, dados) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensagemPedido(itens, dados))}`

function abrirSacola(abrir) { document.documentElement.classList.toggle('sacola-aberta', abrir) }

function montarCasca() {
  const header = document.querySelector('[data-cabecalho]')
  if (header) header.outerHTML = `<header class="topo"><div class="topo__barra">
    <a class="topo__marca" href="/" aria-label="United Florida FC, início"><img src="${IMG}escudo-120.webp" alt="" width="120" height="133"></a>
    <nav aria-label="Principal"><a href="/#clube">O clube</a><a href="/#uniformes">Uniformes</a><a class="ativo" href="/loja/">Loja</a><a href="/#seletiva">Seletiva</a><a href="/#franquias">Franquias</a></nav>
    <span class="bandeiras"><a href="/loja/" aria-label="Português"><img src="${IMG}bandeiras/brasil.svg" alt="" width="24" height="24"></a><a href="/en/" aria-label="English"><img src="${IMG}bandeiras/eua.svg" alt="" width="24" height="24"></a></span>
    <button class="sacola-btn" type="button" data-abrir-sacola aria-label="Abrir a sacola">${ICONE}<span data-qtd>0</span></button>
  </div></header>`
  const fim = document.querySelector('[data-rodape]')
  if (fim) fim.outerHTML = `<section class="garantias"><ul class="caixa"><li>Produto oficial Reebok</li><li>Pedido direto com o clube</li><li>Atendimento pelo WhatsApp</li></ul></section>
  <footer><div class="caixa"><div class="rod"><img src="${IMG}escudo-120.webp" alt="" width="120" height="133"><div><b>United Florida FC</b><span>O clube dos brasileiros na Flórida.</span></div></div><p class="copy">© ${new Date().getFullYear()} United Florida FC</p></div></footer>`
  document.body.insertAdjacentHTML('beforeend', `<div class="veu" data-fechar-sacola></div>
  <aside class="gaveta" aria-label="Sacola"><div class="gaveta__topo"><h2>Sua <b>sacola</b></h2><button class="fechar" type="button" data-fechar-sacola aria-label="Fechar a sacola">×</button></div><div class="gaveta__lista" data-lista></div><div class="gaveta__fim" data-fim></div></aside>`)
}

function desenharSacola() {
  const itens = ler()
  document.querySelectorAll('[data-qtd]').forEach((q) => { q.textContent = contagem(itens) })
  const lista = document.querySelector('[data-lista]')
  const fim = document.querySelector('[data-fim]')
  if (!lista) return
  lista.innerHTML = itens.length ? itens.map((i) => itemHtml(i, true)).join('') : '<div class="vazio"><p>Sua sacola está vazia.</p><a class="vidro-azul" href="/loja/">Ver a coleção</a></div>'
  fim.innerHTML = itens.length
    ? `${comPreco(itens) ? `<div class="gaveta__total"><span>Subtotal</span><span>${brl(subtotal(itens))}</span></div>` : ''}<a class="vidro-azul whats" href="/loja/checkout/">${ZAP}Finalizar pelo WhatsApp</a><p>O clube confirma valor, frete e pagamento com você no WhatsApp.</p>`
    : ''
}

document.addEventListener('click', (e) => {
  const alvo = e.target.closest('button, [data-fechar-sacola]')
  if (!alvo) return
  if (alvo.matches('[data-abrir-sacola]')) return abrirSacola(true)
  if (alvo.matches('[data-fechar-sacola]')) return abrirSacola(false)
  const chave = alvo.dataset.mais || alvo.dataset.menos || alvo.dataset.tirar
  if (!chave) return
  const [id, tam] = chave.split('|')
  const itens = ler()
  const item = itens.find((i) => i.id === id && i.tam === tam)
  if (!item) return
  if (alvo.dataset.mais) item.qtd++
  else if (alvo.dataset.menos) item.qtd--
  else item.qtd = 0
  gravar(itens.filter((i) => i.qtd > 0))
})
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') abrirSacola(false) })
document.addEventListener('sacola', desenharSacola)
montarCasca()
desenharSacola()
