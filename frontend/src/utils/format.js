export const dueText = (item) => {
  if (item.d < 0) return `En retard de ${-item.d} j`;
  if (item.d === 0) return "À relancer aujourd'hui";
  return `Dans ${item.d} j`;
};

export const dueClass = (item) => (item.d < 0 ? 'late' : item.d === 0 ? 'today' : '');
