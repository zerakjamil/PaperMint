const IMAGE_FILE_EXTENSION_PATTERN =
  /\.(apng|avif|bmp|gif|heic|heif|ico|jpe?g|png|svg|tiff?|webp)$/i

export const isImageFile = (file: File) =>
  file.type.startsWith('image/') || IMAGE_FILE_EXTENSION_PATTERN.test(file.name)