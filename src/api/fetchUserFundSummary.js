// Fetches all entries and metadata for a user, grouped by fund
export async function fetchUserFundSummary(userId) {
  // Get all entries for the user
  const entriesRes = await fetch(`http://localhost:3000/mutual-funds/${userId}`);
  if (!entriesRes.ok) throw new Error('Failed to fetch entries');
  const entries = await entriesRes.json();
  // Get all fund metadata
  const metaRes = await fetch('http://localhost:3000/mutualfund-metadata');
  if (!metaRes.ok) throw new Error('Failed to fetch metadata');
  const metadata = await metaRes.json();
  // Get latest NAVs for all funds
  const navs = {};
  for (const meta of metadata) {
    if (!meta.GoogleValue) continue;
    try {
      const navRes = await fetch(`http://localhost:3000/mf-api?googleValue=${encodeURIComponent(meta.GoogleValue)}`);
      const navData = await navRes.json();
      navs[meta._id] = Number(navData.nav) || null;
    } catch { navs[meta._id] = null; }
  }
  // Group entries by fund
  const fundMap = {};
  for (const meta of metadata) {
    fundMap[meta._id] = {
      fundName: meta.MutualFundName,
      invested: 0,
      todayValue: 0,
      profitLoss: 0,
      balanceUnits: 0,
      nav: navs[meta._id],
    };
  }
  for (const entry of entries) {
    if (!entry.fundName || !fundMap[entry.fundName._id]) continue;
    if (entry.investType === 'Invest' && Number(entry.balanceUnit) > 0) {
      fundMap[entry.fundName._id].invested += (parseFloat(entry.amount) - (parseFloat(entry.principalRedeem) || 0));
      fundMap[entry.fundName._id].todayValue += Number(entry.balanceUnit) * (navs[entry.fundName._id] || 0);
      fundMap[entry.fundName._id].balanceUnits += Number(entry.balanceUnit);
    }
  }
  for (const id in fundMap) {
    fundMap[id].profitLoss = fundMap[id].todayValue - fundMap[id].invested;
  }
  // Only include funds where user has at least one entry
  const filtered = Object.values(fundMap).filter(fund => fund.invested > 0 || fund.balanceUnits > 0 || fund.todayValue > 0);
  return filtered;
}
