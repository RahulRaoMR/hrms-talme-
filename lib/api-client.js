export function apiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return normalizedPath;
}
