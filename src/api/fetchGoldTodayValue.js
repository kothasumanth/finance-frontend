// Fetches gold summary (today value) for a user
import { fetchTodayGoldPrice } from './goldPrice';

export async function fetchGoldTodayValue(userId) {
  const res = await fetch(`http://localhost:3000/gold-entries?userId=${userId}`);
  if (!res.ok) return 0;
  const data = await res.json();
  const totalGrams = data.reduce((sum, e) => sum + (parseFloat(e.grams) || 0), 0);
  const todayGoldPrice = await fetchTodayGoldPrice();
  if (!todayGoldPrice || totalGrams === 0) return 0;
  return parseFloat(todayGoldPrice) * totalGrams;
}
