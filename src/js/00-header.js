// Header: fundo marinho quando o hero sai de baixo dele (sem ouvir o scroll) e a gaveta do menu
// no tablet e no celular.
;(() => {
  const topo = document.getElementById('topo')
  if (!topo) return
  const sentinela = document.querySelector('.topo-sentinela')
  if (sentinela && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      topo.classList.toggle('topo--solido', !e.isIntersecting)
      document.documentElement.classList.toggle('rolou', !e.isIntersecting) // botão flutuante do WhatsApp
    }).observe(sentinela)
  } else {
    topo.classList.add('topo--solido')
    document.documentElement.classList.add('rolou')
  }

  // item do menu da seção que está no meio da tela ganha a pílula clara (.ativo)
  const links = [...topo.querySelectorAll('.topo__menu a[href^="#"]:not(.botao)')]
  const secoes = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean)
  if (secoes.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        const link = links.find((a) => a.getAttribute('href') === `#${e.target.id}`)
        if (link) link.classList.toggle('ativo', e.isIntersecting)
      }
    }, { rootMargin: '-45% 0px -54% 0px' })
    secoes.forEach((s) => io.observe(s))
  }

  const botao = topo.querySelector('.topo__abrir')
  const menu = document.getElementById('menu')
  const rotulos = { abrir: botao.getAttribute('aria-label'), fechar: document.documentElement.lang === 'en' ? 'Close menu' : 'Fechar menu' }
  const alternar = (abrir) => {
    topo.classList.toggle('topo--aberto', abrir)
    botao.setAttribute('aria-expanded', String(abrir))
    botao.setAttribute('aria-label', abrir ? rotulos.fechar : rotulos.abrir)
  }
  botao.addEventListener('click', () => alternar(!topo.classList.contains('topo--aberto')))
  menu.addEventListener('click', (e) => e.target.closest('a') && alternar(false))
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && topo.classList.contains('topo--aberto')) {
      alternar(false)
      botao.focus()
    }
  })
})()
