export async function fetchMutualFundMetadata() {
  const res = await fetch('http://localhost:3000/mutualfund-metadata');
  if (!res.ok) throw new Error('Failed to fetch metadata');
  return res.json();
}
