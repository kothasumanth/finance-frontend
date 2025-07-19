// Fetches gold summary (total price) for a user
export async function fetchGoldSummary(userId) {
  const res = await fetch(`http://localhost:3000/gold-entries`);
  if (!res.ok) return 0;
  const data = await res.json();
  // Sum up all price fields
  return data.reduce((sum, e) => sum + (parseFloat(e.price) || 0), 0);
}
