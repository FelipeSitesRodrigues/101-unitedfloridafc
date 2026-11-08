// Inscrição na seletiva: o botão da categoria já abre a janela com ela escolhida. Ao enviar, os
// dados viram uma mensagem e abrem o WhatsApp do clube (o clube responde com o link do Pix).
// Os rótulos da mensagem saem dos próprios campos, então a versão em inglês manda em inglês.
;(() => {
  const janela = document.getElementById('inscricao')
  const form = janela?.querySelector('[data-inscricao]')
  if (!form) return
  const erro = form.querySelector('[data-erro]')
  janela.addEventListener('abrindo', (e) => {
    const cat = e.detail?.dataset.categoria
    if (cat) form.categoria.value = cat
    erro.hidden = true
  })
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const faltando = [...form.querySelectorAll('[required]')].filter((c) => !c.value.trim())
    form.querySelectorAll('.campo').forEach((c) => c.classList.toggle('campo--erro', faltando.includes(c.querySelector('input, select'))))
    erro.hidden = !faltando.length
    if (faltando.length) return faltando[0].focus()
    const linhas = [...form.querySelectorAll('.campo')]
      .map((c) => {
        const campo = c.querySelector('input, select')
        let v = campo.value.trim()
        if (campo.type === 'date' && v) v = v.split('-').reverse().join('/')
        return v ? `*${c.querySelector('span').textContent.trim()}:* ${v}` : ''
      })
      .filter(Boolean)
    const texto = `${janela.querySelector('[data-msg-inscricao]').innerHTML.trim()}\n\n${linhas.join('\n')}`
    window.open(`https://wa.me/${form.dataset.wa}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener')
  })
})()
