const DEVICE_ID_KEY = 'youandi-device-id';

function generateDeviceId(): string {
  const bytes = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0'),
  );
  return bytes.join('');
}

export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';

  let id = window.localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = generateDeviceId();
    window.localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}
