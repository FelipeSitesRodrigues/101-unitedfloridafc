// Âncoras: as seções abaixo da dobra usam content-visibility e, até aparecerem, têm altura
// estimada. No primeiro clique numa âncora a página desenha tudo e só então rola (bug do 076).
;(() => {
  const html = document.documentElement
  const reduzir = matchMedia('(prefers-reduced-motion: reduce)')
  const desenharTudo = () => html.classList.add('cv-pronto')
  if (location.hash.length > 1) desenharTudo()
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]')
    if (!a || e.defaultPrevented) return
    const id = a.getAttribute('href').slice(1)
    const alvo = id && document.getElementById(id)
    if (!alvo) return
    e.preventDefault()
    desenharTudo()
    // as fontes da citação do fundador só baixam quando a seção é desenhada; se chegam no meio da
    // rolagem, o fundador encolhe ~40 px e a rolagem passa do alvo. Espera elas (até 700 ms).
    const fontes = document.fonts
      ? Promise.race([Promise.all([document.fonts.load('300 20px "Inter Tight"'), document.fonts.load('40px Assinatura')]), new Promise((r) => setTimeout(r, 700))])
      : Promise.resolve()
    fontes.catch(() => {}).then(() => requestAnimationFrame(() => {
      alvo.scrollIntoView({ behavior: reduzir.matches ? 'auto' : 'smooth', block: 'start' })
      history.pushState(null, '', '#' + id)
      if (!alvo.hasAttribute('tabindex')) alvo.setAttribute('tabindex', '-1')
      alvo.focus({ preventScroll: true })
    }))
  })
})()
