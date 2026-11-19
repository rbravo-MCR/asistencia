# Rendimiento de producción — rediseño integral

Chromium 158.0.8127.18; Node v26.13.1. Baseline: snapshot frontend de foundation anterior a esta expansión. Ambos builds usan las mismas dependencias/assets y `NODE_ENV=production`. Fuentes finales archivadas y hashes de dist en [production-bundles.json](evidence/production-bundles.json).

Compilaciones NODE_ENV=production; contextos nuevos; HTTP no-store; APIs simuladas con 120 ms; DTOs sintéticos iguales por pantalla, sesión y política; dashboard sin turnos, asistencia con un turno remoto; sin throttle de CPU/red, sin INP ni backend real; sin aislamiento de CPU del host; suite E2E terminada antes de esta medicion final. Orden emparejado before/after, tres corridas por viewport/tema. No equivale a rendimiento de campo ni valida reglas de negocio.

## Cargas frías

Mediana LCP de tres corridas en milisegundos; CLS máximo de las mismas tres. Son muestras de laboratorio, sin significancia estadística acreditada.

| Pantalla   | Ancho | Tema  | LCP antes | LCP final | CLS antes | CLS final |
| ---------- | ----: | ----- | --------: | --------: | --------: | --------: |
| login      |   390 | light |       296 |       216 |    0.0327 |    0.0000 |
| login      |   390 | dark  |       224 |       212 |    0.0327 |    0.0000 |
| login      |  1440 | light |       204 |       212 |    0.0152 |    0.0000 |
| login      |  1440 | dark  |       188 |       212 |    0.0152 |    0.0000 |
| dashboard  |   390 | light |       636 |       828 |    0.1595 |    0.0000 |
| dashboard  |   390 | dark  |       628 |       812 |    0.1595 |    0.0000 |
| dashboard  |  1440 | light |       804 |       816 |    0.0578 |    0.0164 |
| dashboard  |  1440 | dark  |       816 |       788 |    0.0578 |    0.0164 |
| attendance |   390 | light |       336 |       332 |    0.2566 |    0.0642 |
| attendance |   390 | dark  |       332 |       352 |    0.2566 |    0.0642 |
| attendance |  1440 | light |       408 |       376 |    0.1548 |    0.0164 |
| attendance |  1440 | dark  |       328 |       360 |    0.2032 |    0.0164 |

72 cargas concluyeron con 0 desbordamientos globales y 0 errores JavaScript. Peor CLS final: **0.0642**; peor LCP final: **860 ms**. La referencia CLS≤0.1 se alcanza en este laboratorio. No se declara velocidad uniformemente mejor: el LCP conserva variación y algunas combinaciones suben.

La primera medición identificó CLS móvil elevado. La [traza de fuentes](evidence/layout-diagnostic/measurements.json) aisló el footer moviéndose durante verificación de sesión y consulta. Reservar altura mínima del contenido evita que ese pie entre y salga del viewport. La [medición anterior al ajuste](evidence/production-before-stability/measurements.json) se conserva; solo la [medición final](evidence/production/measurements.json) acredita las fuentes entregadas.

## Bundle

Tamaños gzip calculados por archivo, bytes; no se cuenta todo el JS de rutas diferidas como descarga inicial.

| Recurso                     |  Antes |  Final |
| --------------------------- | -----: | -----: |
| JS referenciado en HTML     | 202199 | 208292 |
| JS+CSS referenciado en HTML | 212463 | 219821 |
| JS de todos los chunks      | 275466 | 293661 |
| CSS total                   |  10264 |  11529 |

JS+CSS inicial aumenta 3.46 %. JS inicial final: **203.41 KiB gzip**, frente al presupuesto preliminar de 200 KiB; ese objetivo de reducción sigue abierto y no se presenta como cumplido. La compilación normal hereda el NODE_ENV del workspace y no se usa para estas cifras.

No hay medición de INP de campo, CPU móvil real, Lighthouse, Safari, RUM ni backend real en este laboratorio. No se ocultan regresiones ni se equiparan estos DTO sintéticos con producción. El cierre visual no equivale a despliegue ni a certificación de rendimiento.
