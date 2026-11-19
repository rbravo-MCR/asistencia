export function notificationDestination(href: string): string | null {
  if (
    !href.startsWith('/') ||
    href.startsWith('//') ||
    href.includes('\\') ||
    Array.from(href).some(
      (char) => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127,
    )
  )
    return null;
  return href;
}
