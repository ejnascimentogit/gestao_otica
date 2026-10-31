// Reduz a foto no próprio navegador antes de enviar (celular tira fotos de 3–8 MB).
export async function reduzirImagem(arquivo: File, ladoMaximo = 1000, qualidade = 0.85): Promise<Blob> {
  if (!/^image\//.test(arquivo.type)) throw new Error('Escolha um arquivo de imagem (JPG, PNG ou WEBP).')
  const url = URL.createObjectURL(arquivo)
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = () => erro(new Error('Não foi possível ler essa imagem.'))
      i.src = url
    })
    const escala = Math.min(1, ladoMaximo / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.round(img.naturalWidth * escala), h = Math.round(img.naturalHeight * escala)
    const cv = document.createElement('canvas')
    cv.width = w; cv.height = h
    const ctx = cv.getContext('2d')!
    ctx.fillStyle = '#ffffff' // PNG com fundo transparente vira branco no JPG
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)
    const blob = await new Promise<Blob | null>(ok => cv.toBlob(ok, 'image/jpeg', qualidade))
    if (!blob) throw new Error('Não foi possível preparar a imagem.')
    return blob
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Imagem para o provador: PNG com fundo transparente. Se vier com fundo (JPG ou PNG sem
 *  transparência), tira o fundo claro: funciona bem com a armação fotografada sobre papel branco. */
export async function prepararImagemProvador(arquivo: File, ladoMaximo = 1400): Promise<Blob> {
  if (!/^image\//.test(arquivo.type)) throw new Error('Escolha um arquivo de imagem (PNG ou JPG).')
  const url = URL.createObjectURL(arquivo)
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => {
      const i = new Image(); i.onload = () => ok(i); i.onerror = () => erro(new Error('Não foi possível ler essa imagem.')); i.src = url
    })
    const escala = Math.min(1, ladoMaximo / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.round(img.naturalWidth * escala), h = Math.round(img.naturalHeight * escala)
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h
    const ctx = cv.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(img, 0, 0, w, h)
    const dados = ctx.getImageData(0, 0, w, h), px = dados.data
    let temTransparencia = false
    for (let i = 3; i < px.length; i += 16) if (px[i] < 250) { temTransparencia = true; break }
    if (!temTransparencia) {
      // fundo = média das bordas; quanto mais perto dessa cor, mais transparente
      let r = 0, g = 0, b = 0, n = 0
      const amostra = (x: number, y: number) => { const k = (y * w + x) * 4; r += px[k]; g += px[k + 1]; b += px[k + 2]; n++ }
      for (let x = 0; x < w; x += 4) { amostra(x, 0); amostra(x, h - 1) }
      for (let y = 0; y < h; y += 4) { amostra(0, y); amostra(w - 1, y) }
      r /= n; g /= n; b /= n
      for (let k = 0; k < px.length; k += 4) {
        const d = Math.hypot(px[k] - r, px[k + 1] - g, px[k + 2] - b)
        px[k + 3] = Math.round(255 * Math.max(0, Math.min(1, (d - 18) / 45)))
      }
      ctx.putImageData(dados, 0, 0)
    }
    // recorta a sobra transparente em volta da armação
    const d2 = ctx.getImageData(0, 0, w, h).data
    let x0 = w, y0 = h, x1 = 0, y1 = 0
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d2[(y * w + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
    if (x1 <= x0 || y1 <= y0) throw new Error('Não encontramos a armação na imagem. Use fundo branco e liso.')
    const out = document.createElement('canvas'); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1
    out.getContext('2d')!.drawImage(cv, x0, y0, out.width, out.height, 0, 0, out.width, out.height)
    const blob = await new Promise<Blob | null>(ok => out.toBlob(ok, 'image/png'))
    if (!blob) throw new Error('Não foi possível preparar a imagem.')
    return blob
  } finally {
    URL.revokeObjectURL(url)
  }
}
