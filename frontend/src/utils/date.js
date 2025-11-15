// frontend/src/utils/date.js
// Helpers to format dates to Indian Standard Time (IST)
export function toISTString(ts) {
  // Accept Firestore Timestamp (has toDate), ISO string, or JS Date
  const date = ts && typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
  if (!date || isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
