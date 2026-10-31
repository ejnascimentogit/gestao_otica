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
