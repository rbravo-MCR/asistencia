# Línea base visual y de rendimiento

Fecha de ejecución: 2026-11-18T17:25:11.356Z. Navegador: Chromium 158.0.8127.18. Node 26.13.1 / pnpm 12.18.0. PostgreSQL real 18.6, `127.0.0.1:55433/asistencia_test`. Sin uso de SQLite o datos empresariales de desarrollo.

## Protocolo y alcance de las capturas

- Build real mediante `pnpm build`. Servidor estático local temporal, assets gzip, `Cache-Control: no-store`, fallback SPA y proxy `/api` del mismo origen a API real en modo test. Los workers de asistencia y avisos están desactivados para el recolector; la suite E2E sí los activa según su configuración existente.
- 91 capturas del build: 22 rutas a 1440 y 390 px, bienvenida pública/404, muestra de empleado a 320/360/768/1024/1280, controles de acceso EMPLOYEE/HR/SUPER_ADMIN, preferencia oscura y dos estados de red controlados. 89 recorridos con metadatos DOM y dos capturas de carga/error identificadas.
- 52 capturas adicionales preservadas de los E2E de esta ejecución: marcajes aceptados/rechazados, home office, falta tardía, calendario publicado, avisos, auditoría, saldo, permisos/evidencias y cuentas. Total: 143 PNG.
- Viewport fijo por captura, altura 900 CSS px, locale es-MX, zona America/Merida, reduced motion. E2E conserva sus perfiles Desktop Chrome/Pixel 7. La matriz del recolector cambia ancho, sin afirmar que todos los anchos equivalen a un teléfono físico.
- Datos ficticios de `_test`, incluyendo fixtures de pruebas previas que ya existían en esa base. El recolector crea cuatro cuentas y un expediente/departamento propios, no publica turnos ni concede saldo y elimina solo sus fixtures. No modifica desarrollo. No se guardan claves, cookies, tokens ni estado de sesión en artefactos.
- Fecha/hora del servidor registradas, sin falsear negocio. Son capturas de referencia, no golden snapshots deterministas: un futuro diff automático requiere fijar reloj y dataset aislado. Las fechas, UUID y contenido de fixtures pueden variar entre ejecuciones.

## Hallazgos observados

| ID  | Evidencia actual                                                                                                                                                                                       | Trabajo posterior                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| B01 | `/usuarios` a 390 px tiene ancho global de 437 px con ADMIN y SUPER_ADMIN. Capturas `admin-390-usuarios.png` y `super_admin-390-usuarios.png`; nombres largos y botones sin salto presionan el layout. | Corregir reflow y acciones en pantalla de usuarios, manteniendo todas sus facultades.                                                  |
| B02 | Calendario de empleado a 320 px alcanza 324 px de ancho global. Captura `employee-320-calendario.png`; controles Mes/Empleado compiten por espacio.                                                    | Reorganizar filtros a 320 px en fase calendario.                                                                                       |
| B03 | Header administrativo: 213 px a 1440; 373 px a 390. El contenido empieza después de ese bloque.                                                                                                        | Shell compacto y navegación móvil; mantener jornada/acción principal visibles.                                                         |
| B04 | Las seis capturas con preferencia oscura mantienen fondo `rgb(245, 247, 248)` y no tienen `data-theme`.                                                                                                | Implementar tema real en tokens y superficies; preferencia del navegador no acredita tema oscuro.                                      |
| B05 | CLS medido en carga supera 0.1 en dashboard y asistencia. Hay transición de sesión/navegación y contenido asíncrono sin espacio suficiente reservado.                                                  | Medir y estabilizar shell/estados de carga en fases 3–7. La contribución exacta de cada elemento requiere traza adicional al corregir. |
| B06 | JS inicial gzip 278.4 KiB frente a objetivo preliminar 200.                                                                                                                                            | Revisar imports anticipados y partición por features, sin retirar validación/seguridad.                                                |

Tres recorridos presentan overflow global, correspondientes a dos pantallas. Los otros 86 recorridos medidos no presentan ancho global mayor al viewport. Esto no garantiza ausencia de recortes internos ni certifica accesibilidad.

Revisión visual representativa: login desktop/móvil, dashboard administrativo, asistencia home office con datos E2E, usuarios móvil y calendario 320. Los metadatos de los 89 recorridos incluyen encabezados, alertas, ancho, altura de header, fuentes, tema y cantidad de enlaces. No hubo eventos JavaScript `pageerror` durante esos recorridos; no equivale a ausencia de toda respuesta HTTP de error (401 anónimo y errores controlados son esperados).

## Medición sobre producción: tres cargas frías por ruta y perfil

Se miden login público, dashboard de empleado y asistencia de empleado; estos dos últimos sin turno publicado, con cuenta/expediente ficticios. Caché desactivada con CDP, contexto nuevo por corrida, credenciales únicamente en memoria. Observadores PerformanceObserver de LCP, layout-shift y longtask. Se espera fin de red, carga de fuentes y 500 ms adicionales; el CLS refleja esa ventana de carga, no una sesión de uso completa. El detalle bruto incluye DCL, load, transferencia y tareas largas.

Perfil desktop: viewport 1440×900, sin limitación artificial de CPU/red, servidor local. Perfil restringido: viewport 390×900, CPU ×4, latencia 150 ms, descarga 200000 B/s y subida 93750 B/s. Es simulación de laboratorio en el mismo host; no es percentil 75 de campo ni medición de un teléfono real.

| Perfil      | Ruta          | LCP mediana | LCP peor | CLS mediana | CLS peor |
| ----------- | ------------- | ----------- | -------- | ----------- | -------- |
| Desktop     | `/ingresar`   | 0.216 s     | 0.224 s  | 0.000       | 0.016    |
| Desktop     | `/`           | 0.520 s     | 0.604 s  | 0.148       | 0.148    |
| Desktop     | `/asistencia` | 0.296 s     | 0.332 s  | 0.434       | 0.446    |
| Restringido | `/ingresar`   | 2.404 s     | 2.432 s  | 0.076       | 0.076    |
| Restringido | `/`           | 2.788 s     | 2.828 s  | 0.112       | 0.112    |
| Restringido | `/asistencia` | 2.600 s     | 2.628 s  | 0.965       | 0.965    |

La referencia de guía 10 es LCP ≤2.5 s y CLS ≤0.1. Dashboard/asistencia superan LCP en el perfil restringido y CLS en ambos perfiles. Los valores son hallazgos de baseline; no se declaran metas aprobadas ni se corrige producto en esta etapa.

## Peso de recursos iniciales

| Recurso                        | Sin comprimir | Gzip       | Brotli     |
| ------------------------------ | ------------- | ---------- | ---------- |
| `index-DMGMOl-J.js`            | 488.18 KiB    | 132.04 KiB | 112.09 KiB |
| `rolldown-runtime-XKyaHtl9.js` | 0.71 KiB      | 0.42 KiB   | 0.37 KiB   |
| `react-CDb74C0S.js`            | 421.16 KiB    | 125.49 KiB | 101.84 KiB |
| `validation-DqYOb19n.js`       | 72.98 KiB     | 20.44 KiB  | 18.02 KiB  |
| `index-DqM0DIDg.css`           | 28.42 KiB     | 5.95 KiB   | 5.22 KiB   |

JS inicial: 285073 B / 278.39 KiB gzip; CSS inicial: 6097 B / 5.95 KiB gzip. Suma de JS referenciado como script/modulepreload por el HTML; excluye logo y chunk dinámico de dashboard. Compresión reproducible con zlib de Node; puede diferir levemente del estimado de Vite por opciones de compresión. Hardware y metadatos en `evidence/bundle.json`.

## Métricas y pruebas que esta referencia no acredita

- Lighthouse no está instalado en el entorno/dependencias. No hay score Performance/Accessibility ni se inventa uno; no fue necesario instalar paquetes para medir LCP, CLS y bundle.
- INP no medido: las cargas sin interacción no lo producen. Requiere recorridos de interacción apropiados o RUM; no se sustituye por tareas largas/TBT.
- Sin RUM, percentil 75, teléfono físico/GPS, Safari/Firefox, lector de pantalla o certificación WCAG. La revisión completa de contraste/teclado/zoom corresponde a los componentes/pantallas que se rediseñen.
- Las capturas de preferencia oscura muestran la brecha actual; no cuentan como validación de un tema oscuro existente.

## Reproducción

Desde la raíz del repositorio, con dependencias ya instaladas y `.env` local existente:

```bash
pnpm db:test:up
pnpm test:integration
pnpm build
cp docs/verification/2026-11-18-ux-ui-baseline/evidence/capture-baseline.mjs.txt /tmp/mcr-baseline.mjs
node --import tsx /tmp/mcr-baseline.mjs
```

No correr E2E y recolector simultáneamente: usan puertos 3101/5183 y la misma base de prueba. El recolector exige `_test`, abre/cierra su API/servidor/navegador y limpia sus propios IDs en `finally`. En entornos que cierren procesos largos con SIGTERM, ejecutar mediante supervisor independiente; `capture-exit.txt` registra el cierre de esta ejecución, salida 0. Una ejecución anterior interrumpida dejó cuatro cuentas y un departamento ficticios en `_test`; se identificaron por los prefijos exclusivos del recolector y se limpiaron antes de la repetición completa. No se tocaron cuentas reales ni registros de otras suites.

El script escribe checkpoints tras cada captura y medición. Los archivos brutos, el código usado y el snapshot de fuentes están incluidos para inspección. El servidor temporal se usa solo para esta medición y no es configuración de despliegue.
