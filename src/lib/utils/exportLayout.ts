export type Size = {
  width: number
  height: number
}

const imageExtensionPattern = /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i

export const isImageSourceValue = (value?: string) => {
  const trimmed = value?.trim() ?? ''

  if (!trimmed) {
    return false
  }

  return (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('blob:') ||
    imageExtensionPattern.test(trimmed)
  )
}

export const resolveImageDataUrl = async (source: string): Promise<string> => {
  const trimmed = source.trim()

  if (trimmed.startsWith('data:image/')) {
    return trimmed
  }

  const response = await fetch(trimmed)
  if (!response.ok) {
    throw new Error('Unable to load image source for export.')
  }

  const blob = await response.blob()

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Unable to decode image source.'))
    reader.readAsDataURL(blob)
  })
}

export const fitWithinBox = (
  source: Size,
  bounds: Size,
  allowUpscale = false,
): Size => {
  if (source.width <= 0 || source.height <= 0) {
    return { width: bounds.width, height: bounds.height }
  }

  const widthRatio = bounds.width / source.width
  const heightRatio = bounds.height / source.height
  const ratio = allowUpscale
    ? Math.min(widthRatio, heightRatio)
    : Math.min(widthRatio, heightRatio, 1)

  return {
    width: Math.max(1, Math.round(source.width * ratio)),
    height: Math.max(1, Math.round(source.height * ratio)),
  }
}

export const getImageTypeFromDataUrl = (dataUrl: string): 'png' | 'jpg' => {
  const mime = dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/)?.[1] ?? ''

  if (mime === 'image/jpeg' || mime === 'image/jpg') {
    return 'jpg'
  }

  if (mime === 'image/png') {
    return 'png'
  }

  const normalized = dataUrl.split('?')[0]?.toLowerCase() ?? ''
  if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) {
    return 'jpg'
  }

  if (normalized.endsWith('.png')) {
    return 'png'
  }

  return 'png'
}

export const getImageDimensionsFromDataUrl = async (
  dataUrl: string,
): Promise<Size> => {
  if (typeof Image === 'undefined') {
    return { width: 1200, height: 800 }
  }

  return new Promise<Size>((resolve, reject) => {
    const image = new Image()

    image.onload = () => {
      resolve({
        width: image.naturalWidth || image.width || 1200,
        height: image.naturalHeight || image.height || 800,
      })
    }

    image.onerror = () => {
      reject(new Error('Unable to read image dimensions.'))
    }

    image.src = dataUrl
  })
}
