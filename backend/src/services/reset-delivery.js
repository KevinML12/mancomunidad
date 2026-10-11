export function resetDeliveryConfigured() {
  return Boolean(process.env.RESET_DELIVERY_URL && process.env.RESET_DELIVERY_SECRET);
}

export async function deliverResetCode({ correo, token, expira }) {
  const endpoint = new URL(process.env.RESET_DELIVERY_URL);
  if (endpoint.protocol !== 'https:' && process.env.NODE_ENV !== 'test') {
    throw new Error('Entrega requiere HTTPS');
  }
  const response = await fetch(endpoint, {
    method: 'POST',
    signal: AbortSignal.timeout(10000),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RESET_DELIVERY_SECRET}`,
    },
    body: JSON.stringify({ correo, token, expira }),
  });
  if (!response.ok) throw new Error('Entrega fallida');
}
