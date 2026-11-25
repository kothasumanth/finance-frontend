export function getDefaultSetupEndDate(startDate) {
  if (!startDate) return '';

  const [year, month] = startDate.split('-').map(Number);
  const normalizedStartMonth = month < 4 ? 3 : month - 1;
  const endDate = new Date(Date.UTC(year, normalizedStartMonth + 179, 1));

  return [
    endDate.getUTCFullYear(),
    String(endDate.getUTCMonth() + 1).padStart(2, '0'),
    String(endDate.getUTCDate()).padStart(2, '0')
  ].join('-');
}

export function getSetupDateRange(entries) {
  const dates = entries
    .map(entry => entry.date?.slice(0, 10))
    .filter(Boolean)
    .sort();

  return {
    startDate: dates[0] || '',
    endDate: dates[dates.length - 1] || ''
  };
}
