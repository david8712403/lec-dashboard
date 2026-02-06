export const getDayOfWeek = (dateStr: string): number => {
  const [year, month, day] = dateStr.split('-').map((part) => Number(part));
  if (!year || !month || !day) return 1;
  const weekday = new Date(year, month - 1, day).getDay();
  return weekday === 0 ? 7 : weekday;
};
