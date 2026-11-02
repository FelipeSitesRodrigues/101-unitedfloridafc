// Recorta o objeto principal da foto (fundo transparente): pessoas da equipe, selos.
// Uso: node scripts/recortar.mjs <entrada> <saida.png>
import { removeBackground } from '@imgly/background-removal-node'
import { readFile, writeFile } from 'node:fs/promises'
const [entrada, saida] = process.argv.slice(2)
const blob = new Blob([await readFile(entrada)], { type: entrada.endsWith('.png') ? 'image/png' : 'image/jpeg' })
const res = await removeBackground(blob, { model: 'medium', output: { format: 'image/png' } })
await writeFile(saida, Buffer.from(await res.arrayBuffer()))
console.log('ok', saida)
