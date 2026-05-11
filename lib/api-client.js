export function apiUrl(path) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const isPlaceholder = baseUrl?.includes("your-backend.onrender.com");

  return baseUrl && !isPlaceholder ? `${baseUrl}${normalizedPath}` : normalizedPath;
}
