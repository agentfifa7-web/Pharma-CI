/** Empreinte SHA-256 (hex) d'un ensemble de fichiers — base du système anti-duplication. */
export async function fingerprintFiles(files: File[]) {
  const buffers = await Promise.all(files.map((f) => f.arrayBuffer()))
  // L'ordre des pages ne doit pas changer l'empreinte : on trie les empreintes individuelles.
  const parts = await Promise.all(buffers.map((b) => crypto.subtle.digest('SHA-256', b)))
  const hexes = parts.map(toHex).sort()
  const all = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hexes.join('|')))
  return toHex(all)
}

const toHex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** ID unique lisible dérivé de l'empreinte : ORD-CI-2026-8F92K */
export function prescriptionIdFrom(fingerprint: string, year = new Date().getFullYear()) {
  let code = ''
  for (let i = 0; i < 5; i++) code += ALPHABET[parseInt(fingerprint.slice(i * 2, i * 2 + 2), 16) % ALPHABET.length]
  return `ORD-CI-${year}-${code}`
}

export const randomCode = (len = 6, alphabet = ALPHABET) =>
  Array.from(crypto.getRandomValues(new Uint8Array(len)), (x) => alphabet[x % alphabet.length]).join('')

export const otpCode = () => Array.from(crypto.getRandomValues(new Uint8Array(4)), (x) => x % 10).join('')

export const uid = (prefix = '') => prefix + randomCode(8)

/** Réduit une image en data URL JPEG pour l'aperçu et le stockage local. */
export async function imagePreview(file: File, max = 900, quality = 0.72): Promise<string | undefined> {
  if (!file.type.startsWith('image/')) return undefined
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = rej
      i.src = url
    })
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * scale)
    c.height = Math.round(img.height * scale)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', quality)
  } finally {
    URL.revokeObjectURL(url)
  }
}
