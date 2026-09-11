const FINE_PER_DAY = 10;

// Normalize to calendar day (UTC midnight) to avoid timezone off-by-one
const normalizeToCalendarDay = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
};

// Calculate overdue days and fine amount
// dueDate: required, referenceDate: date to compare (returnDate or now)
const calculateFine = (dueDate, referenceDate, ratePerDay = FINE_PER_DAY) => {
  if (!dueDate || !referenceDate) {
    return { overdueDays: 0, fineAmount: 0 };
  }
  const due = new Date(dueDate);
  const ref = new Date(referenceDate);
  if (isNaN(due.getTime()) || isNaN(ref.getTime())) {
    return { overdueDays: 0, fineAmount: 0 };
  }

  const dueDay = normalizeToCalendarDay(due);
  const refDay = normalizeToCalendarDay(ref);

  if (dueDay === null || refDay === null) {
    return { overdueDays: 0, fineAmount: 0 };
  }

  const diffMs = refDay - dueDay;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const overdueDays = Math.max(0, diffDays);
  const fineAmount = overdueDays * ratePerDay;

  return { overdueDays, fineAmount };
};

module.exports = {
  FINE_PER_DAY,
  normalizeToCalendarDay,
  calculateFine
};
