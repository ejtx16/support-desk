/** Badge text: exact count up to 9, then "9+". */
export const formatBadge = (count: number) => (count > 9 ? '9+' : String(count));
