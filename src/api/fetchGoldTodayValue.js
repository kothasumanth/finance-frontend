// Fetches gold summary (today value) for a user
import { fetchTodayGoldPrice } from './goldPrice';

export async function fetchGoldSummary(userId) {
  const res = await fetch(`http://localhost:3000/gold-entries?userId=${userId}`);
  if (!res.ok) return { invested: 0, todayValue: 0 };
  const data = await res.json();
  const todayGoldPrice = await fetchTodayGoldPrice();
  const invested = data.reduce((sum, entry) => sum + (parseFloat(entry.price) || 0), 0);
  if (!todayGoldPrice) return { invested, todayValue: 0 };

  const totalTodayValue = data.reduce((sum, e) => {
    const karat = [18, 22, 24].includes(Number(e.karat)) ? Number(e.karat) : 24;
    const grams = parseFloat(e.grams) || 0;
    const priceKey = karat === 24 ? 'price24k' : karat === 22 ? 'price22k' : 'price18k';
    return sum + grams * (parseFloat(todayGoldPrice[priceKey]) || 1);
  }, 0);

  return { invested, todayValue: totalTodayValue };
}

export async function fetchGoldTodayValue(userId) {
  const summary = await fetchGoldSummary(userId);
  return summary.todayValue;
}
