# Despliegue de ClubManager en Netlify

Este documento detalla los pasos para poner en producción **ClubManager** en [Netlify](https://www.netlify.com/) con PostgreSQL externo (Supabase/Neon), pasarela de cobros (Mercado Pago) y notificaciones de WhatsApp Cloud.

---

## 1. Archivos de Configuración Incluidos

El repositorio ya contiene la configuración oficial para Next.js en Netlify:
- **`netlify.toml`**: define el plugin `@netlify/plugin-nextjs` y el comando de build estándar (`npm run build`).
- **`package.json`**: dependencias completas y tipadas (Drizzle ORM, Mercado Pago, Postgres, Next.js).
- **`src/lib/mercadopago.ts`**: wrapper híbrido que opera tanto con el SDK oficial en producción como en modo mock en entornos sin acceso a red.
- **`src/lib/whatsapp.ts`**: cliente para WhatsApp Cloud API con fallback de desarrollo.

---

## 2. Variables de Entorno Requeridas en Netlify

En tu panel de Netlify (**Site configuration > Environment variables**), añade las siguientes variables:

| Variable | Descripción | Ejemplo / Formato |
|---|---|---|
| `NEXT_PUBLIC_BASE_URL` | URL pública de tu app en Netlify | `https://tu-clubmanager.netlify.app` |
| `DATABASE_URL` | Cadena de conexión PostgreSQL (Supabase o Neon) | `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres` |
| `MERCADO_PAGO_ACCESS_TOKEN` | Token de acceso (Sandbox o Prod) | `APP_USR-...` o `TEST-...` |
| `MERCADO_PAGO_PUBLIC_KEY` | Public Key (opcional, para checkout) | `APP_USR-...` o `TEST-...` |
| `WHATSAPP_API_TOKEN` | Token Bearer permanente de Meta Developers | `EAAG...` |
| `WHATSAPP_PHONE_NUMBER_ID` | ID del número telefónico de WhatsApp Business | `1029384756...` |

---

## 3. Pasos para Subir el Código a Netlify

### Opción A: Vía GitHub / GitLab / Bitbucket (Recomendada)
1. Sube tu código a un repositorio Git (ej: GitHub).
2. Entra a [Netlify](https://app.netlify.com/) y pulsa **"Add new site" > "Import an existing project"**.
3. Selecciona el repositorio de **ClubManager**.
4. Netlify detectará automáticamente `next build` y el archivo `netlify.toml`.
5. Carga las variables de entorno en la configuración del sitio antes del primer deploy o despliega y configúralas para el rebuild.

### Opción B: Vía Netlify CLI (Despliegue Directo)
En tu terminal local con Node y Git instalados:
```bash
# 1. Instalar la CLI de Netlify globalmente si no la tienes
npm install -g netlify-cli

# 2. Iniciar sesión en Netlify
netlify login

# 3. Vincular y desplegar el proyecto
netlify init
# Sigue las instrucciones en pantalla para vincular tu sitio

# 4. Desplegar a producción
netlify deploy --build --prod
```

---

## 4. Inicializar la Base de Datos Externa

Antes o inmediatamente después del primer deploy, debes aplicar las migraciones a tu base de datos de producción:

```bash
# En tu máquina local, apuntando temporalmente a tu PostgreSQL productivo:
DATABASE_URL="postgresql://postgres:[PASS]@[HOST]:5432/postgres" npm run db:migrate
DATABASE_URL="postgresql://postgres:[PASS]@[HOST]:5432/postgres" npm run db:seed
```

---

## 5. Configurar el Webhook de Mercado Pago

1. Entra al panel de desarrolladores de Mercado Pago.
2. En la sección **Webhooks / Notificaciones IPN**, ingresa la URL de tu sitio desplegado:
   ```
   https://tu-clubmanager.netlify.app/api/payments/webhook
   ```
3. Selecciona los eventos de **Pagos (Payments)**.
