/**
 * Minimal wrapper for Meta WhatsApp Cloud API.
 *
 * When the real environment variables are present the functions will call the
 * official endpoint using `fetch`. In sandboxed runs (no network) the calls are
 * simulated and a successful JSON response is returned so the rest of the
 * application can continue to compile and be tested.
 */

const WHATSAPP_TOKEN = process.env.WHATSAPP_API_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

/**
 * Send a template message.
 *
 * @param to Phone number in international format (e.g. "5491123456789").
 * @param templateName Name of the approved template.
 * @param language Language code (e.g. "es_AR").
 * @param components Array of component objects as defined by Meta API.
 * @returns Promise resolving to the API response JSON.
 */
export async function sendTemplateMessage(
  to: string,
  templateName: string,
  language: string = 'es_AR',
  components: any[] = []
): Promise<any> {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    // Mock response – useful for local dev / sandbox without network
    return {
      messaging_product: 'whatsapp',
      contacts: [{ wa_id: to }],
      messages: [{ id: `mock_${Date.now()}` }],
    };
  }

  const url = `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: language },
      components,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`WhatsApp API error ${response.status}: ${err}`);
  }
  return response.json();
}
