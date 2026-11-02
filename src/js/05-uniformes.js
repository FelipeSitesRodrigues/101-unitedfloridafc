// Vitrine dos uniformes: três camisas em roda. Clicar numa lateral (ou nas setas, nos pontos,
// nas setas do teclado, ou arrastar no celular) leva aquela camisa pro centro. A que dá a volta
// por trás some e reaparece do outro lado, em vez de atravessar o centro.
;(() => {
  const vitrine = document.querySelector('[data-vitrine]')
  if (!vitrine) return
  const kits = [...vitrine.querySelectorAll('.kit')]
  const pontos = [...vitrine.querySelectorAll('[data-ir]')]
  const aviso = vitrine.querySelector('[data-vitrine-aviso]')
  const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches
  const pos = (k) => Number(k.dataset.pos)
  const nome = (k) => k.querySelector('.kit__nome').textContent

  const atualizar = () => {
    const centro = kits.find((k) => pos(k) === 0)
    pontos.forEach((p) => p.setAttribute('aria-current', String(Number(p.dataset.ir) === Number(centro.dataset.kit))))
    kits.forEach((k) => {
      const lateral = pos(k) !== 0
      k.querySelector('.kit__comprar').tabIndex = lateral ? -1 : 0
      k.setAttribute('aria-hidden', String(lateral))
    })
    if (aviso) aviso.textContent = nome(centro)
  }

  // passo +1: tudo anda uma casa pra esquerda (a da direita vem pro centro); -1 ao contrário
  const girar = (passo) => {
    for (const k of kits) {
      let novo = pos(k) - passo
      if (novo < -1 || novo > 1) {
        novo = novo < -1 ? 1 : -1
        if (reduzir) k.dataset.pos = novo
        else {
          k.classList.add('kit--salta')
          setTimeout(() => {
            k.dataset.pos = novo
            requestAnimationFrame(() => k.classList.remove('kit--salta'))
          }, 190)
        }
      } else k.dataset.pos = novo
    }
    atualizar()
  }
  const irPara = (indice) => {
    const alvo = kits.find((k) => Number(k.dataset.kit) === indice)
    if (alvo && pos(alvo) !== 0) girar(pos(alvo))
  }

  vitrine.querySelector('.vitrine__seta--ant').addEventListener('click', () => girar(-1))
  vitrine.querySelector('.vitrine__seta--prox').addEventListener('click', () => girar(1))
  kits.forEach((k) => k.querySelector('.kit__toque').addEventListener('click', () => girar(pos(k))))
  pontos.forEach((p) => p.addEventListener('click', () => irPara(Number(p.dataset.ir))))
  vitrine.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') girar(-1)
    else if (e.key === 'ArrowRight') girar(1)
  })

  // arrastar no celular
  const palco = vitrine.querySelector('.vitrine__palco')
  let x0 = null
  palco.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') x0 = e.clientX
  })
  palco.addEventListener('pointerup', (e) => {
    if (x0 === null) return
    const dx = e.clientX - x0
    x0 = null
    if (Math.abs(dx) > 40) girar(dx < 0 ? 1 : -1)
  })
  palco.addEventListener('pointercancel', () => (x0 = null))
  atualizar()
})()
