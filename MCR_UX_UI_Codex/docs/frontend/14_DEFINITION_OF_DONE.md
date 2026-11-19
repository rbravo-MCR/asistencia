# Definition of Done y autorización de entrega

**MCR · Sistema de asistencia | Directrices de implementación | 18-11-2026**

## Checklist obligatorio por fase

- [ ] Cambios acotados a alcance aprobado, sin rutas o funcionalidades simuladas.
- [ ] Logo original, siete colores y Google Sans conforme a licencia/disponibilidad.
- [ ] Tokens semánticos, componentes reutilizados y sin CSS duplicado.
- [ ] Tema claro/oscuro, responsive, teclado, foco y contraste verificados.
- [ ] Loading, empty, error, forbidden, pending, éxito y red desconocida contemplados.
- [ ] Acciones reales con estados del servidor; no éxito ficticio en HTTP 200 rechazado.
- [ ] Home office sin GPS; presencial conserva geocerca y precisión.
- [ ] Idempotencia, CSRF, sesión, permisos y alcance preservados.
- [ ] Aprobaciones HEAD_ONLY/históricas correctas; sin autoaprobación.
- [ ] Turnos publicados, snapshots, marcajes y auditoría inmutables según contrato.
- [ ] `pnpm check`, integración y E2E aplicables con evidencia de salida.
- [ ] Capturas revisadas, mediciones y contraste documentados.
- [ ] No datos reales, secretos ni archivos fuente de tipografía no autorizados incluidos.
- [ ] Dependencias/lockfile intactos salvo cambio autorizado y justificado.

## Demostración de aceptación

1. Empleado inicia sesión y registra entrada presencial; repetir home office sin GPS; mostrar rechazo real y motivo cuando aplique.
2. Jefatura encuentra pendiente y decide con motivo; demostrar cuenta técnica sin autoridad de decisión.
3. ADMIN/HR crea borrador, mueve con alternativa de teclado, publica y prueba conflicto; no edita publicado.
4. Empleado solicita permiso por horas y ve restricciones; vacaciones separadas por períodos sin inventar saldo.
5. Directivo navega indicador hacia detalle permitido; cambiar sesión sin datos residuales.
6. Mostrar mismo flujo móvil/desktop, claro/oscuro, red lenta y efectos reducidos.

## Criterio de cierre

P0: seguridad, pérdida de datos, errores de marcaje/aprobación o bloqueo de flujo crítico → no entregar. P1: navegación inaccesible, contraste insuficiente, regresión significativa o estado incorrecto → corregir antes de liberar. P2: refinamientos no críticos → documentar y acordar seguimiento. No declarar WCAG certificado ni producción lista sin verificaciones operativas reales.

## Informe de entrega de Codex

Incluir resumen, archivos modificados, decisiones visuales, comportamiento preservado, pruebas y resultados reales, mediciones baseline/final, capturas, cambios de dependencias, limitaciones y riesgos. Identificar explícitamente toda propuesta no implementada. Solicitar autorización antes de ampliar alcance o tocar backend. La fase termina cuando se demuestra calidad, no cuando se generan pantallas.
