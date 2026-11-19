# Cierre de puntos 1 y 2: preparación del rediseño MCR

Fecha: 18-11-2026. **Puntos 1 y 2 terminados como contraste, inventario y línea base.** El rediseño visual comienza en el punto 3; no se avanzó a su implementación.

## Entregables

1. [Contraste y discrepancias](01-contraste.md): fuentes vigentes, catorce diferencias/aclaraciones y tratamiento para no cambiar negocio.
2. [Inventario frontend](02-inventario.md): las 22 rutas, capacidades/operaciones, componentes, estados, arquitectura y pruebas asociadas.
3. [Baseline visual y rendimiento](03-baseline.md): protocolo, 18 mediciones de producción, tamaño de recursos, fallos de reflow y límites reales.
4. [Índice de las 143 capturas](04-evidencia-visual.md): 91 del build de producción y 52 de flujos E2E; escritorio/móvil, perfiles y estados de referencia.
5. [Snapshot del código original](evidence/frontend-source-before-redesign.tar.gz), [contenido y SHA-256](evidence/source-archive.json), [hashes de fuentes consultadas](evidence/source-manifest.json) e [inventario estructurado](evidence/inventory.json).

## Criterios de cierre de estas dos tareas

- [x] Leer políticas, API/contratos y decisiones del 17–18; contrastar el paquete UX/UI sin reabrir decisiones resueltas.
- [x] Registrar discrepancias y separar propuestas visuales de reglas implementadas.
- [x] Inventariar rutas, componentes, permisos, operaciones, estados y suites existentes.
- [x] Guardar capturas actuales con datos ficticios y metadatos; revisión representativa y detección de overflow en todos los recorridos registrados.
- [x] Medir build de producción: tres cargas frías de login/dashboard/asistencia en dos perfiles; bundle gzip/Brotli.
- [x] Ejecutar baseline de calidad, integración PostgreSQL y E2E; conservar fallos y resultados reales.
- [x] Guardar snapshot y hashes porque la rama `setup/base-tecnica` aún no tiene commits y el árbol original está sin seguimiento. No crear un commit inicial que mezcle el trabajo anterior.
- [x] Conservar fuentes de producto, contratos, dependencias/lockfile, migraciones y `.env`. Solo se añadieron documentación/evidencia y se actualizó el estado de la lista de tareas. Los builds generados son resultados de verificación.

## Resultados ejecutados

| Comando                 | Resultado actual                                                                                                                                | Evidencia                                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `pnpm check`            | **Salida 1**: lint/boundaries pasan; formato falla en 16 Markdown del paquete UX/UI recibido. El comando se detiene antes de tipos/tests/build. | [check.txt](evidence/check.txt)                                                                        |
| `pnpm typecheck`        | Sin errores, ejecutado separadamente.                                                                                                           | [typecheck.txt](evidence/typecheck.txt)                                                                |
| `pnpm test`             | 186/186 pruebas; 30 archivos.                                                                                                                   | [unit-ui.txt](evidence/unit-ui.txt)                                                                    |
| `pnpm build`            | Contratos, API y web compilados; ejecución agrupada de tipos/tests/build con salida 0.                                                          | [build.txt](evidence/build.txt)                                                                        |
| `pnpm db:test:up`       | PostgreSQL de pruebas healthy; servidor real 18.6 confirmado.                                                                                   | [environment.json](evidence/environment.json)                                                          |
| `pnpm test:integration` | Salida 0; 175/175 pruebas, 17 archivos, PostgreSQL `_test`.                                                                                     | [integration.txt](evidence/integration.txt)                                                            |
| `pnpm test:e2e`         | Salida 0; 38/38 Chromium escritorio y móvil; 2.4 min.                                                                                           | [e2e.txt](evidence/e2e.txt)                                                                            |
| Recolector producción   | Salida 0; 91 capturas, 18 mediciones, cero eventos `pageerror` en recorridos.                                                                   | [browser-baseline.json](evidence/browser-baseline.json), [capture-exit.txt](evidence/capture-exit.txt) |

**399 pruebas aprobadas; `pnpm check` global permanece fallando por el formato original.** La [revisión global final de formato](evidence/format-final.txt) confirma los mismos 16 archivos originales; la documentación nueva y sus JSON pasan Prettier. [Validación de artefactos y fuentes](evidence/artifact-validation.json) y [limpieza de fixtures](evidence/cleanup.json) comprobadas al cierre. Warnings de `scrollTo` en jsdom y NO_COLOR/FORCE_COLOR no causaron fallos. No se alteraron pruebas para obtener estos resultados.

## Qué debe atender la implementación posterior

- Corregir el formato del paquete recibido antes de exigir gate global verde; esta auditoría conserva intactos los originales y registra el fallo previo.
- Conservar `LATE_ABSENCE`, corte administrativo configurable y aprobación `HEAD_ONLY` nueva/histórica diferenciada. En detalle de solicitudes se usan `canHeadDecide`/`canDirectorDecide`; `canDecide` corresponde al resumen dashboard.
- Implementar tokens MCR, temas reales, superficies semánticas y tipografía autorizada; retirar verde anterior también de metadatos.
- Reducir header móvil (373 px observado), reparar Usuarios a 390 px y Calendario a 320 px, reservar espacio de carga y optimizar bundle.
- JS inicial actual 278.39 KiB gzip frente al objetivo preliminar 200. CLS de dashboard/asistencia supera 0.1; en perfil restringido sus LCP también superan 2.5 s. Ver valores y método en baseline, sin atribuirlos a dispositivos reales.

Estos hallazgos no dejan incompleto el inventario: son los defectos y distancias respecto al objetivo que el baseline debe hacer visibles. Sí impiden presentar la interfaz actual como rediseño aprobado o gate de entrega visual superado.

## Límites

Sin cambios de backend, políticas empresariales, saldos, jornadas reales, dependencias o despliegue. Las únicas mutaciones nuevas del recolector son fixtures sintéticos en `_test`, limpiados al cerrar; las suites conservan su mecanismo existente de aislamiento. Se guardó fuente original sin `.env`, credenciales ni datos de PostgreSQL.

No hay score Lighthouse, INP/RUM, certificación WCAG ni validación de teléfono físico. La referencia visual usa fecha/dataset de la ejecución, no golden snapshots deterministas. Estos límites se detallan para que las fases siguientes comparen evidencia equivalente. La app móvil nativa, offline, biometría y producción permanecen fuera de estos dos puntos.
