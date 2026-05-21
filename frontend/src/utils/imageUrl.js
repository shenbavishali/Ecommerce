export function resolveImageUrl(imageUrl) {
  if (!imageUrl) {
    return '';
  }

  return imageUrl.startsWith('/static')
    ? `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}${imageUrl}`
    : imageUrl;
}

export function productImageUrl(product) {
  return resolveImageUrl(product?.image || product?.image_url);
}
