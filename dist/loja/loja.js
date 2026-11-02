// Loja virtual, prévia demonstrativa: produtos, sacola (fica no navegador) e cabeçalho comum das
// páginas da loja. Sem cobrança de verdade: falta o Maicon definir como quer receber.
const IMG = '/assets/img/'
const PRODUTOS = {
  marinho: { nome: 'Camisa I Marinho 2027', a: 'Camisa I', b: 'Marinho 2027', preco: 299.9, cat: 'camisa', cor: 'Marinho', hex: '#0E2664', foto: 'camisa-marinho-560', jogador: 'produto-marinho', desc: 'A camisa titular da estreia na UPSL. Tecido leve da Reebok, gola polo em V com friso branco e escudo bordado no peito.' },
  branca: { nome: 'Camisa II Branca 2027', a: 'Camisa II', b: 'Branca 2027', preco: 299.9, cat: 'camisa', cor: 'Branca', hex: '#FFFFFF', foto: 'camisa-branca-560', jogador: 'produto-branca', desc: 'A camisa reserva da temporada de estreia. Branco neve com gola e punhos em marinho, escudo bordado e logo Reebok.' },
  celeste: { nome: 'Camisa III Celeste 2027', a: 'Camisa III', b: 'Celeste 2027', preco: 299.9, cat: 'camisa', cor: 'Celeste', hex: '#9CCBEB', foto: 'camisa-celeste-560', jogador: 'produto-celeste', desc: 'A camisa alternativa do clube. Celeste com gola e punhos em marinho, escudo bordado e logo Reebok.' },
  bone: { nome: 'Boné Oficial United Florida', a: 'Boné Oficial', b: 'United Florida', preco: 129.9, cat: 'bone', foto: 'bone-560', desc: 'O boné oficial do clube, em marinho, com o escudo bordado na frente e o logo Reebok na lateral.' },
}
const TAMANHOS = ['P', 'M', 'G', 'GG', 'XGG']
const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

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
const subtotal = (itens) => itens.reduce((s, i) => s + PRODUTOS[i.id].preco * i.qtd, 0)
const contagem = (itens) => itens.reduce((s, i) => s + i.qtd, 0)
const ICONE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>'

const itemHtml = (i, comControles) => {
  const p = PRODUTOS[i.id]
  return `<div class="item"><img src="${IMG}${p.foto}.webp" alt="" width="78" height="84"><div><h3>${p.nome}</h3><small>Tamanho: ${i.tam}</small>${comControles
    ? `<span class="qtd"><button type="button" data-menos="${i.id}|${i.tam}" aria-label="Diminuir">−</button>${i.qtd}<button type="button" data-mais="${i.id}|${i.tam}" aria-label="Aumentar">+</button></span>`
    : `<small>Quantidade: ${i.qtd}</small>`}</div><div><span class="item__preco">${brl(p.preco * i.qtd)}</span>${comControles ? `<button type="button" class="remover" data-tirar="${i.id}|${i.tam}">Remover</button>` : ''}</div></div>`
}

function abrirSacola(abrir) { document.documentElement.classList.toggle('sacola-aberta', abrir) }

function montarCasca() {
  const header = document.querySelector('[data-cabecalho]')
  if (header) header.outerHTML = `<header class="topo"><div class="topo__barra">
    <a class="topo__marca" href="/" aria-label="United Florida FC, início"><img src="${IMG}escudo-120.webp" alt="" width="120" height="133"></a>
    <nav aria-label="Principal"><a href="/#clube">O clube</a><a href="/#uniformes">Uniformes</a><a class="ativo" href="/loja/">Loja</a><a href="/#peneira">Peneiras</a><a href="/#franquias">Franquias</a></nav>
    <span class="bandeiras"><a href="/loja/" aria-label="Português"><img src="${IMG}bandeiras/brasil.svg" alt="" width="24" height="24"></a><a href="/en/" aria-label="English"><img src="${IMG}bandeiras/eua.svg" alt="" width="24" height="24"></a></span>
    <button class="sacola-btn" type="button" data-abrir-sacola aria-label="Abrir a sacola">${ICONE}<span data-qtd>0</span></button>
  </div></header>`
  const fim = document.querySelector('[data-rodape]')
  if (fim) fim.outerHTML = `<section class="garantias"><ul class="caixa"><li>Produto oficial Reebok</li><li>Pagamento seguro</li><li>Atendimento pelo WhatsApp</li></ul></section>
  <footer><div class="caixa"><div class="rod"><img src="${IMG}escudo-120.webp" alt="" width="120" height="133"><div><b>United Florida FC</b><span>O clube dos brasileiros na Flórida.</span></div></div><p class="copy">© 2026 United Florida FC</p></div></footer>`
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
  fim.innerHTML = itens.length ? `<div class="gaveta__total"><span>Subtotal</span><span>${brl(subtotal(itens))}</span></div><a class="vidro-azul" href="/loja/checkout/">Finalizar compra →</a><p>Frete e desconto do Pix no próximo passo.</p>` : ''
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
