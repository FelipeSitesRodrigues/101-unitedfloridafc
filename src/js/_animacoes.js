// Kit de animações de entrada (skill /animacoes-site). Nasceu no 000 (portfólio do Felipe).
// Sem biblioteca e sem ouvir o scroll: tudo por IntersectionObserver. Vai no fim do <body>.
// No <head>, antes do CSS: <script>document.documentElement.classList.add('js')</script>
;(() => {
  const temIO = 'IntersectionObserver' in window
  const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches
  const mouse = matchMedia('(hover: hover) and (pointer: fine)').matches

  // ---------------------------------------------------------------- revelação no scroll
  // [data-revela] ganha .visivel quando entra na tela (uma vez só)
  const alvos = document.querySelectorAll('[data-revela]')
  if (!temIO) alvos.forEach((el) => el.classList.add('visivel'))
  else {
    const io = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue
          e.target.classList.add('visivel')
          io.unobserve(e.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    )
    alvos.forEach((el) => io.observe(el))
  }

  // ---------------------------------------------------------------- números que contam
  // [data-conta] conta de 0 até o valor do próprio texto ("+100", "15+", "3 dias"). O HTML já
  // traz o valor final: sem JS ou com movimento reduzido o número está lá. Dentro de
  // [data-conta-grupo] (faixa de números) todos partem no mesmo quadro e chegam juntos: o
  // número arredonda pra baixo e só mostra o final no fim. Número pequeno (até ~5) não conta:
  // de 0 a 3 são 3 saltos e parece travado; nesse caso, entrada com pulo de escala no CSS.
  const contar = (el, largura, partida) => {
    const final = el.textContent
    const m = final.match(/^(\D*?)(\d[\d.]*)(.*)$/)
    if (!m) return
    const alvo = Number(m[2].replace(/\./g, ''))
    const suave = (t) => 1 - Math.pow(1 - t, 3)
    el.style.display = 'inline-block'
    el.style.minWidth = `${Math.ceil(largura)}px` // a largura final fica reservada
    if (el.tagName === 'SPAN') el.style.textAlign = 'left' // "+<span>100</span>": sem buraco
    el.textContent = m[1] + '0' + m[3]
    const quadro = (agora) => {
      // começa no 1º quadro depois do atraso, não no relógio: se a página travar carregando,
      // o número não pula metade do caminho
      if (agora < partida.em) return requestAnimationFrame(quadro)
      partida.inicio ||= agora
      const t = Math.min(1, (agora - partida.inicio) / 1600)
      el.textContent = t < 1 ? m[1] + Math.floor(alvo * suave(t)) + m[3] : final
      if (t < 1) requestAnimationFrame(quadro)
    }
    requestAnimationFrame(quadro)
  }
  const contadores = document.querySelectorAll('[data-conta]')
  if (temIO && !reduzir && contadores.length) {
    const io = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue
          io.unobserve(e.target)
          const partida = { em: performance.now() + Number(e.target.dataset.contaAtraso || 0), inicio: 0 }
          if (e.target.hasAttribute('data-conta-grupo')) {
            for (const el of e.target.querySelectorAll('[data-conta]')) contar(el, el.getBoundingClientRect().width, partida)
          } else contar(e.target, e.boundingClientRect.width, partida)
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    contadores.forEach((el) => el.closest('[data-conta-grupo]') || io.observe(el))
    document.querySelectorAll('[data-conta-grupo]').forEach((g) => io.observe(g))
  }

  // ---------------------------------------------------------------- borda que brilha
  // [data-brilho]: a volta de luz só roda com o botão na tela; no computador o ponto de luz
  // fica onde está o cursor, em px a partir do canto do botão.
  const brilhos = document.querySelectorAll('[data-brilho]')
  if (temIO && !reduzir) {
    const io = new IntersectionObserver((entradas) => entradas.forEach((e) => e.target.classList.toggle('brilho-vivo', e.isIntersecting)))
    brilhos.forEach((el) => io.observe(el))
  }
  if (mouse) {
    for (const el of brilhos) {
      let raf = 0
      let px = 0
      let py = 0
      const aplicar = () => {
        raf = 0
        const caixa = el.getBoundingClientRect() // lida a cada quadro: o botão pode se mexer
        el.style.setProperty('--bx', `${(px - caixa.left).toFixed(1)}px`)
        el.style.setProperty('--by', `${(py - caixa.top).toFixed(1)}px`)
      }
      el.addEventListener('pointerenter', (e) => {
        px = e.clientX
        py = e.clientY
        aplicar()
        el.classList.add('brilho-mouse')
      })
      el.addEventListener('pointermove', (e) => {
        px = e.clientX
        py = e.clientY
        if (!raf) raf = requestAnimationFrame(aplicar)
      })
      el.addEventListener('pointerleave', () => {
        cancelAnimationFrame(raf)
        raf = 0
        el.classList.remove('brilho-mouse')
      })
    }
  }
})()
