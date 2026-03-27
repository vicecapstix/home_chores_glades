export const FB_URL = 'https://home-chores-glades-default-rtdb.asia-southeast1.firebasedatabase.app';

export const PCOLS = [
  { bg: '#EAF4FF', text: '#0B3D6B' },
  { bg: '#E8F5EE', text: '#1A4D35' },
  { bg: '#FEF6E4', text: '#6B4500' },
  { bg: '#FCE8F3', text: '#6B1A46' },
  { bg: '#EEF0FE', text: '#2D2E8F' },
  { bg: '#F0FAE8', text: '#2A5210' },
];

export const CATEGORIES = ['Kitchen', 'Bathroom', 'Bedroom', 'Garden', 'Living Room', 'Outdoor', 'Other'];

export const BADGES = [
  { id: 'first',     label: 'First Chore', icon: '⭐', check: m => (m.completedCount || 0) >= 1 },
  { id: 'century',   label: 'Century',     icon: '💯', check: m => (m.completedCount || 0) >= 100 },
  { id: 'on_fire',   label: 'On Fire',     icon: '🔥', check: m => (m.streak || 0) >= 7 },
  { id: 'dedicated', label: 'Dedicated',   icon: '🏅', check: m => (m.streak || 0) >= 30 },
];

export const READONLY = new URLSearchParams(location.search).get('readonly') === '1';
