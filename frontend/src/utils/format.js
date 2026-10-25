import { API_URL } from '../api/client.js';

const priceFmt = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});
export const formatPrice = (n) => (n === 0 ? 'Free' : priceFmt.format(n));

const dateTimeFmt = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});
export const formatDateTime = (iso) => dateTimeFmt.format(new Date(iso));

const longDateFmt = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});
export const formatLongDate = (iso) => longDateFmt.format(new Date(iso));

const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
export const formatTime = (iso) => timeFmt.format(new Date(iso));

// ISO-строка -> значение для <input type="datetime-local"> в локальном времени
export function toInputDateTime(iso) {
  const d = new Date(iso);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export const imageSrc = (url) => {
  if (!url) return null;
  return url.startsWith('http') ? url : `${API_URL}${url}`;
};

export function categoryHue(category = '') {
  let hash = 0;
  for (const ch of category) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return hash;
}

const EMOJI = {
  concert: '🎵',
  conference: '🎤',
  workshop: '🛠️',
  sports: '🏃',
  local: '🏮',
};
export const categoryEmoji = (category = '') => EMOJI[category.toLowerCase()] || '🎟️';