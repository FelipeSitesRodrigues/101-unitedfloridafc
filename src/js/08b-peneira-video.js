// Vídeo da seletiva: só baixa no 1º clique e toca com som. Os controles são do site (azul do
// clube, botões de vidro), não os do navegador. Somem 2,5 s depois do último movimento com o
// vídeo tocando e voltam ao mexer o mouse, tocar na tela ou usar o teclado.
;(() => {
  const quadro = document.querySelector('[data-pvideo]')
  if (!quadro) return
  const secao = quadro.closest('.pvideo')
  const video = quadro.querySelector('video')
  const barra = quadro.querySelector('[data-pctl-barra]')
  const tempo = quadro.querySelector('[data-pctl-tempo]')
  const btTocar = quadro.querySelector('[data-pctl-tocar]')
  const btSom = quadro.querySelector('[data-pctl-som]')
  const btTela = quadro.querySelector('[data-pctl-tela]')
  const en = document.documentElement.lang === 'en'
  const txt = en
    ? { pausar: 'Pause', tocar: 'Play', mudo: 'Mute', som: 'Unmute' }
    : { pausar: 'Pausar', tocar: 'Tocar', mudo: 'Tirar o som', som: 'Ligar o som' }

  const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  const atualizar = () => {
    const d = video.duration || 54
    const p = video.currentTime / d
    barra.value = Math.round(p * 1000)
    barra.style.setProperty('--p', `${p * 100}%`)
    tempo.textContent = `${mmss(video.currentTime)} / ${mmss(d)}`
  }
  const estado = () => {
    quadro.classList.toggle('pctl--pausado', video.paused)
    btTocar.setAttribute('aria-label', video.paused ? txt.tocar : txt.pausar)
    quadro.classList.toggle('pctl--mudo', video.muted)
    btSom.setAttribute('aria-label', video.muted ? txt.som : txt.mudo)
    acordar()
  }

  let sono
  const acordar = () => {
    quadro.classList.remove('pctl--oculto')
    clearTimeout(sono)
    if (!video.paused) sono = setTimeout(() => quadro.classList.add('pctl--oculto'), 2500)
  }

  quadro.querySelector('[data-pvideo-play]').addEventListener('click', () => {
    secao.classList.add('pvideo--tocando')
    video.play().catch(() => {})
    btTocar.focus({ preventScroll: true })
  })
  const alternar = () => (video.paused ? video.play().catch(() => {}) : video.pause())
  btTocar.addEventListener('click', alternar)
  video.addEventListener('click', alternar)
  btSom.addEventListener('click', () => { video.muted = !video.muted })
  btTela.addEventListener('click', () => {
    if (document.fullscreenElement) return document.exitFullscreen()
    if (quadro.requestFullscreen) quadro.requestFullscreen().catch(() => {})
    else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen() // iPhone
  })
  barra.addEventListener('input', () => {
    const d = video.duration || 54
    video.currentTime = (barra.value / 1000) * d
    atualizar()
  })
  video.addEventListener('timeupdate', atualizar)
  video.addEventListener('loadedmetadata', atualizar)
  for (const ev of ['play', 'pause', 'volumechange']) video.addEventListener(ev, estado)
  video.addEventListener('ended', () => { video.currentTime = 0; atualizar() })
  for (const ev of ['pointermove', 'pointerdown', 'keydown', 'focusin']) quadro.addEventListener(ev, acordar)
  quadro.addEventListener('keydown', (e) => {
    if (e.target === barra || e.target.closest('button')) return
    if (e.key === ' ' || e.key === 'k') { e.preventDefault(); alternar() }
  })
})()
