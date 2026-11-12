export const pad = (n) => String(n).padStart(2, '0');

export const iso = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const TODAY = () => iso(new Date());

export const addDays = (dateString, days) => {
  const date = new Date(`${dateString || TODAY()}T00:00`);
  date.setDate(date.getDate() + days);
  return iso(date);
};

export const diffDays = (later, earlier) =>
  Math.round((new Date(`${later}T00:00`) - new Date(`${earlier}T00:00`)) / 864e5);

export const fr = (dateString) => (dateString ? dateString.split('-').reverse().join('/') : '—');

export const startOfWeek = (date = new Date()) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
};
