import { apiUrl } from '../api.js'
// Fetches gold summary (total price) for a user
export async function fetchGoldSummary(userId) {
  const res = await fetch(apiUrl('/gold-entries'));
  if (!res.ok) return 0;
  const data = await res.json();
  // Sum up all price fields
  return data.reduce((sum, e) => sum + (parseFloat(e.price) || 0), 0);
}
