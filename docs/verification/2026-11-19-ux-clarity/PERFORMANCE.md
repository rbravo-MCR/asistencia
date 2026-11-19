# Rendimiento de producción — UX clara

Compilaciones NODE_ENV=production; contextos nuevos; HTTP no-store; APIs simuladas con 120 ms; DTOs sintéticos iguales por pantalla, sesión y política; Inicio sin turno con días disponibles, Vacaciones con saldo10/reserva2/disponible8 y Solicitudes sin registros; sin throttle de CPU/red, sin INP ni backend real; sin aislamiento de CPU del host; suite E2E terminada antes de esta medicion final. Orden emparejado before/after, tres corridas por viewport/tema. No equivale a rendimiento de campo ni valida reglas de negocio.

Chromium 158.0.8127.18; Node v26.13.1. Baseline: snapshot al inicio de esta mejora UX, posterior al rediseño integral MCR. Fuentes finales archivadas en `source-final.tar.gz`; hashes y tamaños en [bundles.json](production/bundles.json).

## Cargas frías

LCP: mediana de tres corridas en ms. CLS: máximo de las mismas tres. Muestras de laboratorio, sin significancia estadística acreditada.

| Pantalla  | Ancho | Tema  | LCP antes | LCP final | CLS antes | CLS final |
| --------- | ----: | ----- | --------: | --------: | --------: | --------: |
| dashboard |   390 | light |       752 |       752 |    0.0000 |    0.0000 |
| dashboard |   390 | dark  |       756 |       772 |    0.0000 |    0.0000 |
| dashboard |  1440 | light |       824 |       784 |    0.0164 |    0.0164 |
| dashboard |  1440 | dark  |       780 |       756 |    0.0164 |    0.0164 |
| vacation  |   390 | light |       272 |       276 |    0.0000 |    0.0000 |
| vacation  |   390 | dark  |       272 |       276 |    0.0000 |    0.0000 |
| vacation  |  1440 | light |       272 |       288 |    0.0164 |    0.0164 |
| vacation  |  1440 | dark  |       284 |       284 |    0.0164 |    0.0164 |
| requests  |   390 | light |       280 |       296 |    0.0220 |    0.0000 |
| requests  |   390 | dark  |       276 |       276 |    0.0220 |    0.0000 |
| requests  |  1440 | light |       300 |       416 |    0.0167 |    0.0164 |
| requests  |  1440 | dark  |       280 |       412 |    0.0167 |    0.0164 |

72 cargas; 0 desbordamientos globales y 0 cargas con errores JavaScript. Peor CLS final: **0.0164**; peor LCP final: **788 ms**. No se afirma mejora uniforme de velocidad; las cifras varían según pantalla y corrida.

## Bundle

Bytes gzip por archivo. Los chunks diferidos no se cuentan como descarga inicial.

| Recurso                     |  Antes |  Final |
| --------------------------- | -----: | -----: |
| JS referenciado en HTML     | 208292 | 208282 |
| JS+CSS referenciado en HTML | 219821 | 219983 |
| JS de todos los chunks      | 293661 | 299839 |
| CSS total                   |  11529 |  11701 |

JS inicial final: **203.40 KiB gzip**, por encima del presupuesto preliminar de200 KiB heredado. No se presenta ese presupuesto como cumplido. No hay medición INP de campo, teléfono físico, Safari, Lighthouse, RUM ni backend real en este laboratorio.
