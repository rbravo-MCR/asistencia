# Rendimiento y capturas de Departamentos

## Protocolo

Baseline: build de producción anterior al cambio, cuyo JS/CSS inicial coincide con la entrega verificada de sidebar/Usuarios. Final: compilación nueva de pnpm check. Ambos usan el mismo recolector, API y PostgreSQL real `_test`, fixtures temporales y workers desactivados. Chromium 158.0.8127.18. Tres cargas frías por perfil: desktop 1440×900; restringido 390×900, CPU ×4, latencia 150 ms, descarga 200000 B/s y subida 93750 B/s. Gzip, caché desactivada, contexto nuevo y movimiento reducido. CLS cubre la carga hasta 500 ms después de estabilizar red/fuentes.

[Baseline bruto](baseline-production/evidence/browser-baseline.json) · [Final bruto](production/evidence/browser-baseline.json) · [Recolector](production/evidence/capture-production.mjs.txt). No son percentiles de campo ni mediciones de un teléfono físico.

| Perfil      | LCP antes mediana / peor | LCP final mediana / peor | CLS antes mediana / peor | CLS final mediana / peor |
| ----------- | -----------------------: | -----------------------: | -----------------------: | -----------------------: |
| desktop     |          0.364 / 0.384 s |          0.352 / 0.368 s |            0.068 / 0.068 |            0.063 / 0.063 |
| constrained |          3.132 / 3.264 s |          3.076 / 3.108 s |            0.113 / 0.113 |            0.093 / 0.093 |

JS inicial total gzip, incluido bootstrap: 265.61 → **265.73 KiB**. CSS: 8.59 → 9.74 KiB. [Antes](evidence/bundle-before.json) · [Final](evidence/bundle-final.json). El módulo diferido de Departamentos incorpora el coste de menú y confirmación accesibles de Radix; no hay instalaciones nuevas.

Las metas globales LCP ≤2.5 s, CLS ≤0.1 y presupuesto inicial JS preliminar 200 KiB permanecen abiertas donde las mediciones las exceden. Tres muestras no prueban significancia estadística. No se inventan INP/Lighthouse ni se certifica producción o WCAG completa. El resultado visual se entrega para revisión, sin propagarlo a otros módulos.

## Capturas para revisión

Las capturas de referencia consultan datos realmente persistidos en PostgreSQL de prueba. Nombres QA son fixtures temporales, no departamentos precargados en desarrollo. No hay KPI ficticios; el número mostrado procede del listado autorizado y la búsqueda. Carga/error se ejercitan deteniendo o interrumpiendo transporte de solicitudes reales; el vacío sin permisos corresponde a GET real de un empleado sin departamentos asignados.

| Ancho / directorio | Claro                                               | Oscuro                                             |
| ------------------ | --------------------------------------------------- | -------------------------------------------------- |
| 320 px             | [PNG](screenshots/final/departments-light-320.png)  | [PNG](screenshots/final/departments-dark-320.png)  |
| 360 px             | [PNG](screenshots/final/departments-light-360.png)  | [PNG](screenshots/final/departments-dark-360.png)  |
| 390 px             | [PNG](screenshots/final/departments-light-390.png)  | [PNG](screenshots/final/departments-dark-390.png)  |
| 768 px             | [PNG](screenshots/final/departments-light-768.png)  | [PNG](screenshots/final/departments-dark-768.png)  |
| 1024 px            | [PNG](screenshots/final/departments-light-1024.png) | [PNG](screenshots/final/departments-dark-1024.png) |
| 1280 px            | [PNG](screenshots/final/departments-light-1280.png) | [PNG](screenshots/final/departments-dark-1280.png) |
| 1440 px            | [PNG](screenshots/final/departments-light-1440.png) | [PNG](screenshots/final/departments-dark-1440.png) |

| Estado / viewport                 | Claro                                                     | Oscuro                                                   |
| --------------------------------- | --------------------------------------------------------- | -------------------------------------------------------- |
| Edición en drawer / desktop       | [PNG](screenshots/final/drawer-light-desktop.png)         | [PNG](screenshots/final/drawer-dark-desktop.png)         |
| Menú de acciones / desktop        | [PNG](screenshots/final/menu-light-desktop.png)           | [PNG](screenshots/final/menu-dark-desktop.png)           |
| Confirmación / desktop            | [PNG](screenshots/final/delete-light-desktop.png)         | [PNG](screenshots/final/delete-dark-desktop.png)         |
| Búsqueda sin resultados / desktop | [PNG](screenshots/final/empty-light-desktop.png)          | [PNG](screenshots/final/empty-dark-desktop.png)          |
| Carga / desktop                   | [PNG](screenshots/final/loading-light-desktop.png)        | [PNG](screenshots/final/loading-dark-desktop.png)        |
| Error / desktop                   | [PNG](screenshots/final/error-light-desktop.png)          | [PNG](screenshots/final/error-dark-desktop.png)          |
| Vacío de lectura / desktop        | [PNG](screenshots/final/empty-readonly-light-desktop.png) | [PNG](screenshots/final/empty-readonly-dark-desktop.png) |
| Edición en drawer / mobile        | [PNG](screenshots/final/drawer-light-mobile.png)          | [PNG](screenshots/final/drawer-dark-mobile.png)          |
| Menú de acciones / mobile         | [PNG](screenshots/final/menu-light-mobile.png)            | [PNG](screenshots/final/menu-dark-mobile.png)            |
| Confirmación / mobile             | [PNG](screenshots/final/delete-light-mobile.png)          | [PNG](screenshots/final/delete-dark-mobile.png)          |
| Búsqueda sin resultados / mobile  | [PNG](screenshots/final/empty-light-mobile.png)           | [PNG](screenshots/final/empty-dark-mobile.png)           |
| Carga / mobile                    | [PNG](screenshots/final/loading-light-mobile.png)         | [PNG](screenshots/final/loading-dark-mobile.png)         |
| Error / mobile                    | [PNG](screenshots/final/error-light-mobile.png)           | [PNG](screenshots/final/error-dark-mobile.png)           |
| Vacío de lectura / mobile         | [PNG](screenshots/final/empty-readonly-light-mobile.png)  | [PNG](screenshots/final/empty-readonly-dark-mobile.png)  |

Nombre de 100 caracteres y viewport 390×320: [desktop](screenshots/final/long-name-landscape-desktop.png), [móvil](screenshots/final/long-name-landscape-mobile.png). El diálogo limita su altura, permite scroll interno y mantiene botones accesibles.

Baseline visual: [desktop](screenshots/before-desktop.png), [móvil](screenshots/before-mobile.png). Producción final sin filtros:

- 320 px: [claro](production/screenshots/light-320-departments.png), [oscuro](production/screenshots/dark-320-departments.png).
- 390 px: [claro](production/screenshots/light-390-departments.png), [oscuro](production/screenshots/dark-390-departments.png).
- 768 px: [claro](production/screenshots/light-768-departments.png), [oscuro](production/screenshots/dark-768-departments.png).
- 1440 px: [claro](production/screenshots/light-1440-departments.png), [oscuro](production/screenshots/dark-1440-departments.png).

Los E2E verifican ausencia de overflow global, fuente local, teclado, foco de menú/drawer/confirmación, Escape, protección de borrador, recarga/Atrás durante PUT retenido, error de duplicado sin perder texto y foco tras DELETE con GET retenido. Capturas representativas revisadas visualmente por el implementador; la valoración de esta referencia por el usuario queda pendiente. Safari, lector real y teclado virtual no se certifican con Chromium emulado.
