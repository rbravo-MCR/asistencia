# Corrección del ingreso local

## Causa y cambio

El ingreso desde `http://localhost:5173` respondía 403 `CSRF_INVALID` porque `APP_ORIGIN` usaba `http://127.0.0.1:5173`. La pantalla mostraba el mensaje genérico de credenciales incorrectas.

Solo con `NODE_ENV=development`, el servidor acepta ambos nombres de loopback conservando protocolo y puerto. Pruebas y producción mantienen coincidencia exacta. Se conservan la validación de solicitudes cross-site y el token CSRF. La pantalla diferencia un fallo de validación de página de un fallo de credenciales.

## Evidencia

- Regresiones observadas fallando antes del cambio: alias local rechazado en HTTP y mensaje incorrecto en la interfaz.
- `pnpm check`: 91 pruebas unitarias/UI; lint, formato, tipos y compilación correctos.
- `pnpm test:integration`: 59 pruebas con PostgreSQL correctas, incluida aceptación del alias en desarrollo y rechazo en producción.
- `pnpm test:e2e`: 12 pruebas correctas en escritorio y móvil.
- Chromium contra el entorno de desarrollo: ingreso 200, recarga autenticada y cierre de sesión seguido de 401 en ambos hosts. Se utilizó la cuenta existente, sin cambiar su contraseña.
- Las pruebas de orígenes rechazan otros protocolos, puertos y dominios; no se amplía la confianza para dominios públicos.
