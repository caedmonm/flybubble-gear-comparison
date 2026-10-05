// Price links follow the exact size's model status.
export function canCheckShopPrice(product, variant) {
  return !!product.url && variant?.status === 'Current';
}
