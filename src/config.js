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
  { id: 'getting_started', label: 'Getting Started', icon: '🌱', check: m => (m.completedCount || 0) >= 10 },
  { id: 'tenacious',       label: 'Tenacious',       icon: '💪', check: m => (m.completedCount || 0) >= 25 },
  { id: 'half_century',    label: 'Fifty Strong',    icon: '🎯', check: m => (m.completedCount || 0) >= 50 },
  { id: 'century',   label: 'Century',     icon: '💯', check: m => (m.completedCount || 0) >= 100 },
  { id: 'consistent',      label: 'Consistent',      icon: '📅', check: m => (m.streak || 0) >= 3 },
  { id: 'on_fire',   label: 'On Fire',     icon: '🔥', check: m => (m.streak || 0) >= 7 },
  { id: 'dedicated', label: 'Dedicated',   icon: '🏅', check: m => (m.streak || 0) >= 30 },
];

export const READONLY = new URLSearchParams(location.search).get('readonly') === '1';

// Web app config for Firebase Auth (#97). Not secrets: Firebase web API keys are
// public identifiers; access is controlled by the database rules. Copy apiKey from
// Firebase Console → Project settings → General → Your apps. Without it, sign-in
// (anonymous and parent email) is unavailable and the app runs without auth.
export const FB_API_KEY     = '';
export const FB_AUTH_DOMAIN = 'home-chores-glades.firebaseapp.com';
export const FB_PROJECT_ID  = 'home-chores-glades';
