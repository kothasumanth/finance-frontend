// API for gold price
export async function fetchTodayGoldPrice() {
  const res = await fetch('http://localhost:3000/gold-price');
  if (!res.ok) return null;
  return await res.json();
}

export async function saveTodayGoldPrice(price24k, price22k, price18k) {
  const res = await fetch('http://localhost:3000/gold-price', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      price24k: Number(price24k) || 1,
      price22k: Number(price22k) || 1,
      price18k: Number(price18k) || 1
    })
  });
  if (!res.ok) throw new Error('Failed to save gold price');
  return await res.json();
}
