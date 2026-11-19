# Empleados: comparación de producción antes/después

19-11-2026. Verificación de la implementación autorizada de Empleados. No acredita cierre del rediseño integral.

## Protocolo

Se reconstruyó el frontend anterior desde `frontend-before.tar.gz` en un directorio temporal propio: fuentes `apps/web/src`, configuración de Vite/TypeScript, package.json, index.html, public y assets originales; dependencias ya instaladas mediante enlaces, sin instalar paquetes ni copiar `.env`. La copia temporal conserva `.gitignore` y excluye la segunda salida de build para que Tailwind no escanee código compilado. Se compiló antes/después con **NODE_ENV=production** y el mismo Vite. No se modificaron fuentes, `.env` ni el dist habitual del workspace.

El build estándar del check anterior carga la configuración local de desarrollo; en la inspección actual `.env` declara `NODE_ENV=development`. Sus tamaños no deben mezclarse con los de estas compilaciones explícitas de producción. [Build anterior](evidence/production-before-build.txt) y [actual](evidence/production-after-build.txt).

[Script ejecutado](evidence/measure-production.mjs), [salida](evidence/production-measure.txt), [mediciones](evidence/production/measurements.json) y [resumen calculado](evidence/production/summary.json).

- Chromium 158.0.8127.18, Node 26.13.1; viewport 390/1440 × 941, ambos temas y movimiento reducido.
- Tres contextos fríos por combinación antes/después, en orden emparejado: 24 cargas. Servidores HTTP locales efímeros con `no-store`; sin compresión HTTP, throttle ni aislamiento de CPU del host.
- ADMIN sintético y los mismos doce empleados, departamento y opciones en ambos builds. API **simulada** con 120 ms por GET; sin servidor de negocio ni PostgreSQL en esta medición. La suite E2E con API/PostgreSQL real se ejecuta por separado.
- Observadores LCP/CLS desde init, espera al primer expediente, fuentes e imágenes cargadas y 750 ms de estabilización. No hay interacciones para medir INP. Ocho capturas de producción; el logo original carga, sin reemplazos.
- La suite E2E había terminado antes de la medición final. No se certifican condiciones del host ni un dispositivo físico.

## Resultados

Valores LCP en milisegundos y CLS sin unidad. Cada celda expresa mediana / peor valor de tres cargas.

| Ancho / tema | LCP antes | LCP después | CLS antes       | CLS después     |
| ------------ | --------- | ----------- | --------------- | --------------- |
| 390 / light  | 320 / 332 | 292 / 316   | 0.625 / 0.625   | 0.0922 / 0.0922 |
| 390 / dark   | 300 / 300 | 316 / 328   | 0.625 / 0.625   | 0.0922 / 0.0922 |
| 1440 / light | 304 / 356 | 200 / 200   | 0.1143 / 0.1143 | 0.09 / 0.09     |
| 1440 / dark  | 328 / 360 | 324 / 388   | 0.1143 / 0.1143 | 0.09 / 0.0994   |

Las 24 cargas terminaron sin `pageerror` y sin overflow global. El CLS mejora en las cuatro combinaciones; el LCP conserva variación entre corridas. No se presenta como mejora uniforme de velocidad ni como medición de campo. El final de la ventana de observación no equivale a una sesión completa de usuario.

[Antes oscuro escritorio](evidence/production/before-dark-1440.png) · [Después oscuro escritorio](evidence/production/after-dark-1440.png) · [Después claro móvil](evidence/production/after-light-390.png). Se revisaron estas capturas y el par móvil; el listado original con formulario permanente se sustituye por directorio y edición contextual. Los datos son ficticios; las capturas productivas no agregan empleados al sistema.

## Recursos

Resumen gzip reportado por Vite, no bytes HTTP medidos en el servidor estático sin compresión:

| Recurso                  | Antes     | Después   |
| ------------------------ | --------- | --------- |
| CSS principal            | 10.06 kB  | 10.40 kB  |
| JS principal             | 115.01 kB | 115.05 kB |
| React                    | 68.27 kB  | 68.27 kB  |
| Chunk diferido Empleados | 3.18 kB   | 6.94 kB   |

El chunk de Empleados no representa por sí solo todo lo transferido por la ruta: cambiaron las particiones compartidas de Radix. No se afirma cumplimiento del presupuesto global de JS inicial a partir de esta tabla. Se utiliza la imagen existente de 9050 bytes en Empleados oscuro; no se agregaron librerías.

## Pendiente

La medición no resuelve el presupuesto de login/dashboard/asistencia, INP/RUM, red real, equipos modestos, GPS físico, Safari, lector de pantalla ni el rediseño de las demás rutas. La carrera de lectura/limpieza de fixtures en la ejecución paralela de Usuarios sigue documentada; las **78 pruebas E2E pasan con un worker**, sin relajar contratos ni modificar backend.
