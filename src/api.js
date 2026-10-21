const defaultApiBaseUrl = import.meta.env.PROD
  ? 'https://finance-backend-js8l.onrender.com'
  : 'http://localhost:3000'

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl).replace(/\/+$/, '')

export function apiUrl(path) {
  return `${API_BASE_URL}/${path.replace(/^\/+/, '')}`
}

export async function fetchMutualFundMetadata() {
  const res = await fetch(apiUrl('/mutualfund-metadata'));
  if (!res.ok) throw new Error('Failed to fetch metadata');
  return res.json();
}
