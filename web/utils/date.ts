export const getDayOfWeek = (dateStr: string): number => {
  const day = new Date(dateStr).getDay();
  return day === 0 ? 7 : day;
};
