// Janelas (<dialog>): [data-abrir="id"] abre a janela com esse id (e avisa quem abriu, pelo evento
// "abrindo"); [data-fechar] e o clique no véu fecham. O showModal prende o foco dentro.
;(() => {
  document.addEventListener('click', (e) => {
    const abrir = e.target.closest('[data-abrir]')
    if (abrir) {
      const janela = document.getElementById(abrir.dataset.abrir)
      if (janela && !janela.open) {
        janela.dispatchEvent(new CustomEvent('abrindo', { detail: abrir }))
        janela.showModal()
      }
      return
    }
    if (e.target.closest('[data-fechar]')) return e.target.closest('dialog')?.close()
    if (e.target.matches('dialog.janela')) e.target.close()
  })
})()
