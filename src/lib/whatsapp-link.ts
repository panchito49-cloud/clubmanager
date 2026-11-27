/**
 * Generador de enlaces para WhatsApp Web / Móvil con número y mensaje prearmado.
 */

export function formatWhatsAppUrl({
  phone,
  message,
}: {
  phone?: string | null;
  message?: string;
}): string | null {
  if (!phone) return null;

  // Limpiamos el número de teléfono dejando solo dígitos
  let cleanPhone = phone.replace(/[^\d]/g, "");

  // Si es un número argentino que empieza con 11, 15, etc., aseguramos el prefijo de país 549
  if (cleanPhone.startsWith("0")) {
    cleanPhone = cleanPhone.slice(1);
  }
  if (cleanPhone.startsWith("15") && cleanPhone.length === 10) {
    cleanPhone = `11${cleanPhone.slice(2)}`;
  }
  if (!cleanPhone.startsWith("54")) {
    cleanPhone = `549${cleanPhone}`;
  }

  const encodedMessage = message ? encodeURIComponent(message) : "";
  return `https://wa.me/${cleanPhone}${encodedMessage ? `?text=${encodedMessage}` : ""}`;
}
