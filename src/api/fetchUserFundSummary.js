import { apiUrl } from '../api.js'
// Fetches all entries and metadata for a user, grouped by fund
export async function fetchUserFundSummary(userId) {
  // Get all entries for the user
  const entriesRes = await fetch(apiUrl(`/mutual-funds/${userId}`));
  if (!entriesRes.ok) throw new Error('Failed to fetch entries');
  const entries = await entriesRes.json();
  
  // Get all fund metadata
  const metaRes = await fetch(apiUrl('/mutualfund-metadata'));
  if (!metaRes.ok) throw new Error('Failed to fetch metadata');
  const metadata = await metaRes.json();

  // Get all cap types for mapping
  const capTypesRes = await fetch(apiUrl('/api/mfcaptypes'));
  if (!capTypesRes.ok) throw new Error('Failed to fetch cap types');
  const capTypes = await capTypesRes.json();
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
        nav: null,
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
      fundMap[fundId].balanceUnits += Number(entry.balanceUnit);
    }
  }

  // Only request NAVs for funds that contribute to the user's current holdings.
  for (const fund of Object.values(fundMap)) {
    if (fund.balanceUnits <= 0 || Number(fund.invested.toFixed(2)) <= 0 || !fund.metadata.GoogleValue) continue;
    try {
      const navRes = await fetch(apiUrl(`/mf-api?googleValue=${encodeURIComponent(fund.metadata.GoogleValue)}`));
      const navData = await navRes.json();
      fund.nav = Number(navData.nav) || null;
    } catch {
      fund.nav = null;
    }
  }

  for (const fund of Object.values(fundMap)) {
    fund.todayValue = fund.balanceUnits * (fund.nav || 0);
    fund.profitLoss = fund.todayValue - fund.invested;
  }

  // Only include funds with remaining units
  const filtered = Object.values(fundMap)
    .filter(fund => fund.balanceUnits > 0 && Number(fund.invested.toFixed(2)) > 0)
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
