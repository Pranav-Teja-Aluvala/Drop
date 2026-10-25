export function validateProductionOrigin(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('PUBLIC_ORIGIN must be an exact HTTPS origin.'); }
  if (url.protocol !== 'https:' || url.origin !== value || url.username || url.password) throw new Error('PUBLIC_ORIGIN must be an exact HTTPS origin, without a path or trailing slash.');
  return value;
}
