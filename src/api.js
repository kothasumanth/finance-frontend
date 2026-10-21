export const API_BASE_URL = '/api'

export function apiUrl(path) {
  return `${API_BASE_URL}/${path.replace(/^\/+/, '')}`
}

export async function fetchMutualFundMetadata() {
  const res = await fetch(apiUrl('/mutualfund-metadata'));
  if (!res.ok) throw new Error('Failed to fetch metadata');
  return res.json();
}
