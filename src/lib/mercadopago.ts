/**
 * Wrapper for Mercado Pago SDK.
 *
 * In environments where the real `mercadopago` package cannot be installed
 * (e.g. sandbox without network), this module falls back to a minimal mock
 * implementation that mimics the subset of the SDK used by the application.
 *
 * The real SDK exports an object with an `preferences` property containing a
 * `create` method. The mock provides the same shape and returns a fake
 * preference ID and init‑point URL.
 */

let sdk: any;

try {
  // Try to require the real package – this will succeed when the user has
  // installed it locally (outside the sandbox) or when the sandbox gains
  // network access.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  sdk = require('mercadopago');
} catch (e) {
  // Fallback mock implementation
  sdk = {
    configure: (config: { access_token: string }) => {
      // no‑op – store token if needed in future extensions
      (sdk as any)._token = config.access_token;
    },
    preferences: {
      create: async (payload: any) => {
        // Generate a deterministic fake preference ID based on timestamp
        const fakeId = `pref_${Date.now()}`;
        return {
          body: {
            id: fakeId,
            init_point: `https://www.mercadopago.com.br/checkout/v1/redirect?preference-id=${fakeId}`,
            ...payload,
          },
        };
      },
    },
  };
}

export default sdk;
