// API for gold price
export async function fetchTodayGoldPrice() {
  const res = await fetch('http://localhost:3000/gold-price');
  if (!res.ok) return null;
  return await res.json();
}

export async function saveTodayGoldPrice(price) {
  const res = await fetch('http://localhost:3000/gold-price', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ price: Number(price) })
  });
  if (!res.ok) throw new Error('Failed to save gold price');
  return await res.json();
}
