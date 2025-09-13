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

  // Get all cap types for mapping
  const capTypesRes = await fetch('http://localhost:3000/api/mfcaptypes');
  if (!capTypesRes.ok) throw new Error('Failed to fetch cap types');
  const capTypes = await capTypesRes.json();
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
  // Create a map of metadata by ID for quick lookup
  const metadataMap = new Map(metadata.map(meta => [meta._id, meta]));

  // First group entries by fund
  const fundMap = {};
  
  // Process each entry
  for (const entry of entries) {
    if (!entry.fundName || !metadataMap.has(entry.fundName._id)) continue;
    
    const fundMetadata = metadataMap.get(entry.fundName._id);
    const fundId = entry.fundName._id;

    // Initialize fund data if not exists
    if (!fundMap[fundId]) {
      fundMap[fundId] = {
        fundName: fundMetadata.MutualFundName,
        invested: 0,
        todayValue: 0,
        profitLoss: 0,
        balanceUnits: 0,
        nav: navs[fundId],
        ActiveOrPassive: fundMetadata.ActiveOrPassive || '',
        IndexOrManaged: fundMetadata.IndexOrManaged || '',
        CapType: fundMetadata.CapType || '', // This is the _id from captype table
        metadata: fundMetadata // Keep the full metadata for reference
      };
    }

    // Add investment data
    if (entry.investType === 'Invest' && Number(entry.balanceUnit) > 0) {
      const investment = parseFloat(entry.amount) - (parseFloat(entry.principalRedeem) || 0);
      fundMap[fundId].invested += investment;
      fundMap[fundId].todayValue += Number(entry.balanceUnit) * (navs[fundId] || 0);
      fundMap[fundId].balanceUnits += Number(entry.balanceUnit);
    }
  }
  for (const id in fundMap) {
    fundMap[id].profitLoss = fundMap[id].todayValue - fundMap[id].invested;
  }
  // Only include funds where user has at least one entry
  const filtered = Object.values(fundMap)
    .filter(fund => fund.invested > 0 || fund.balanceUnits > 0 || fund.todayValue > 0)
    .map(fund => {
      // Get the cap type name from the cap types array
      const capTypeName = capTypes.find(ct => ct._id === fund.CapType)?.name;
      return {
        ...fund,
        CapTypeName: capTypeName // Add the cap type name for reference
      };
    });
  
  console.log('Final filtered funds with cap types:', filtered);
  return filtered;
}
