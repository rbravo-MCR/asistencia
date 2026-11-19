# Dictamen de preparación para producción

**Sistema:** Asistencia · MCR
**Fecha del dictamen:** 18 de noviembre de 2026
**Alcance evaluado:** API Fastify + PostgreSQL + panel web React (etapas 1–15 y 17). App móvil (etapa 16) fuera de alcance por decisión del usuario.
**Base de evaluación:** código, migraciones, configuración, pruebas automatizadas y respaldos locales del repositorio en esta fecha.
**Dictamen anterior:** [Configuración operativa y preparación de producción](verification/2026-11-17-operational-readiness.md) (NO-GO) y su actualización del 18-11-2026.

---

## 1. Veredicto

> **NO-GO para producción pública.**
>
> **GO técnico para iniciar aceptación (UAT) en un entorno de staging**, condicionado a que se provisionen la infraestructura destino y los datos operativos listados en la sección 4.

El producto **está implementado y verificado**: compila, pasa lint, arquitectura, tipos, 385 pruebas automatizadas y no presenta vulnerabilidades conocidas en dependencias de producción. Lo que impide autorizar el paso a producción **no es un defecto de código**, sino la ausencia de destino real (servidor, dominio, TLS, base y credenciales), de respaldo externo verificado y de los datos operativos que la empresa aún no ha entregado.

No se autoriza exponer el sistema a usuarios reales ni cargar expedientes productivos hasta cerrar los bloqueadores P0.

---

## 2. Evidencia ejecutada el 18-11-2026

| Verificación           | Comando                                                      | Resultado                                                                                                                                                          |
| ---------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Calidad integral       | `pnpm check`                                                 | **Salida 0**: ESLint, fronteras de dependencias (225 módulos / 709 dependencias), Prettier, TypeScript estricto, **182 pruebas unitarias/UI** y build de API + web |
| Integración PostgreSQL | `pnpm test:integration`                                      | **Salida 0**: **169 pruebas** en 16 archivos contra PostgreSQL 18.6 aislado                                                                                        |
| End-to-end             | `pnpm test:e2e`                                              | **Salida 0**: **34 recorridos** Playwright en escritorio y móvil (Chromium)                                                                                        |
| Dependencias           | `pnpm audit --prod`                                          | **0 vulnerabilidades conocidas** en dependencias de producción                                                                                                     |
| Migraciones            | consulta a `drizzle.__drizzle_migrations`                    | **13/13** aplicadas; esquema público con **30 tablas**                                                                                                             |
| Respaldos locales      | inspección de `/home/rafael/.local/state/asistencia/backups` | Último dump del **18-11-2026 14:34Z**, 92,885 bytes, manifiesto SHA-256 `baa487d730bea1ceb13ba1b630205d5a11ed635b12bc091fe8bab8dc606f90f4`, permisos 0600          |

**Total de pruebas aprobadas: 385** (182 unitarias/UI + 169 integración + 34 E2E). Sin fallos ni pruebas omitidas.

Evidencia funcional por etapa en [docs/verification](verification/) y contratos en [docs/api](api/).

---

## 3. Criterios evaluados

| Criterio                           | Estado        | Sustento                                                                                                                                                                                                                                                                                |
| ---------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Funcionalidad del alcance acordado | **Cumple**    | Etapas 1–15 y 17 completas y probadas; CRUD, asistencia, incidencias, solicitudes, vacaciones, permisos, auditoría, avisos, planeación, GPS, dashboard y configuración                                                                                                                  |
| Seguridad de acceso                | **Cumple**    | Contraseñas Argon2, sesiones con hash en base, cookie `HttpOnly` + `SameSite=Strict` + `Secure` en producción, CSRF por HMAC de sesión, validación de `Origin`/`Sec-Fetch-Site`, rate limit en credenciales, Helmet, redacción de datos sensibles en logs, sin credenciales por defecto |
| Autorización y alcance             | **Cumple**    | Permisos por rol y departamento, revalidación transaccional, separación SUPER_ADMIN / autoridad laboral de jefatura (HEAD_ONLY), evidencias privadas sin acceso ajeno                                                                                                                   |
| Integridad y auditoría             | **Cumple**    | Eventos originales preservados, bitácora de auditoría, outbox de avisos, snapshots de políticas y condiciones congeladas por solicitud                                                                                                                                                  |
| Migraciones y datos                | **Cumple**    | 13 migraciones versionadas aplicadas; sin datos ficticios ni saltos de saldo; runner de migración compilado                                                                                                                                                                             |
| Respaldos y recuperación           | **Parcial**   | Respaldo/verificación/restauración aislada local probados; **no existe copia externa cifrada, retención ni restauración del destino real**                                                                                                                                              |
| Configuración de producción        | **Parcial**   | `APP_ORIGIN` exige HTTPS en `NODE_ENV=production`; falta el entorno destino, proxy, TLS y credenciales reales                                                                                                                                                                           |
| Operación y observabilidad         | **Parcial**   | Health checks `live`/`ready`; falta monitoreo, alertas, retención de logs y runbook del destino                                                                                                                                                                                         |
| Correo / notificaciones externas   | **No cumple** | Solo avisos internos persistentes; sin SMTP ni direcciones autorizadas                                                                                                                                                                                                                  |
| Datos operativos reales            | **No cumple** | Faltan saldos y períodos de vacaciones, jornadas, autorizaciones de centro, festivos y decisión del corte 08:30                                                                                                                                                                         |
| Control de versiones / release     | **No cumple** | El repositorio local no tiene commits; todo el árbol figura sin seguimiento. No hay versión etiquetada ni artefacto auditable                                                                                                                                                           |

---

## 4. Bloqueadores para producción

### P0 — Impedimentos absolutos (sin excepción)

1. **Destino de producción inexistente.** No hay servidor, dominio, certificados TLS, proxy inverso, base PostgreSQL ni credenciales productivas provisionadas.
2. **Respaldo externo no verificado.** El respaldo actual es local; no cubre pérdida del equipo. Se requiere almacenamiento externo cifrado, retención acordada y una restauración de prueba en entorno aislado del destino real.
3. **Sin UAT en entorno de aceptación.** No se ha ejecutado el recorrido controlado (marcaje → incidencia → justificación → decisión de jefatura → vacaciones → reserva → aprobación/cancelación) sobre la infraestructura destino.
4. **Sin línea base versionada.** El repositorio no tiene commits; no existe un artefacto etiquetado que permita reconstruir exactamente lo aprobado ni auditar cambios.

### P1 — Bloqueadores operativos dependientes de la empresa

| Pendiente                                     | Estado                                                                               | Responsable sugerido |
| --------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------- |
| Períodos y saldos de vacaciones ya utilizados | 6 empleados sin concesiones; falta respaldo de RR. HH.                               | RR. HH.              |
| Jornadas próximas y vigencias                 | 6 empleados sin publicación; falta fecha de inicio                                   | Operación / RR. HH.  |
| Autorización de centro presencial             | 6 empleados sin autorización vigente                                                 | Operación            |
| Festivos aplicables                           | Ninguno cargado                                                                      | RR. HH.              |
| Corte de falta desde 08:30                    | Falta definir si conserva el marcaje o rechaza la entrada                            | Dirección / RR. HH.  |
| Correos                                       | Sin SMTP, remitente, TLS ni direcciones autorizadas; falta ubicar el archivo externo | TI / RR. HH.         |

La política LFT de vacaciones ya está publicada y los permisos por horas (Entrada tardía y Salida anticipada) ya están configurados; ver [cierre de permisos por horas](verification/2026-11-18-hourly-permissions.md).

---

## 5. Condiciones para cambiar el dictamen a GO

El dictamen solo cambiará a **GO** cuando se acredite, con evidencia del entorno real:

- [ ] Servidor, dominio y TLS configurados; `APP_ORIGIN` HTTPS y proxy sirviendo web + `/api` bajo el mismo origen.
- [ ] Base de producción migrada con el runner compilado y credenciales en archivo externo 0600.
- [ ] Respaldo externo cifrado, política de retención y **restauración de prueba exitosa** en entorno aislado.
- [ ] UAT completo aprobado por operación y RR. HH. en staging, sin datos ficticios en expedientes reales.
- [ ] Datos operativos P1 cargados y validados (saldos, jornadas, centros, festivos, corte 08:30).
- [ ] SMTP o decisión formal de operar solo con avisos internos.
- [ ] Repositorio con commit/tag de release y artefacto reproducible.
- [ ] Monitoreo, alertas y runbook de incidentes definidos para el destino.
- [ ] Revisión de configuración de proxy respecto a `trustProxy` y rate limiting por IP.

---

## 6. Riesgos residuales y límites conocidos

- **Instancia única:** los workers de avisos y evaluación de asistencia, y el rate limit, viven en el proceso de la API. Escalar horizontalmente exige bloqueo distribuido o un solo trabajador dedicado.
- **Proxy inverso:** la API arranca con `trustProxy: false`. Detrás de un proxy, la IP del cliente puede ser la del proxy; revisar el rate limiting por IP antes de exponer.
- **Sin correo:** los avisos son internos; que un aviso figure entregado no prueba envío de correo.
- **Sin app móvil:** etapa 16 pospuesta; el panel web es responsivo y probado en viewport móvil, pero no sustituye una app nativa.
- **Sin pruebas de carga, penetración ni alta disponibilidad:** no se certifican rendimiento bajo volumen real ni recuperación ante desastre del proveedor.
- **Datos de desarrollo:** el respaldo local contiene datos de desarrollo, no expedientes reales; no debe promoverse a producción.
- **Ventana de mantenimiento:** las migraciones se aplican con respaldo previo verificado; no hay migración en caliente certificada.

---

## 7. Recomendación

1. **Autorizar únicamente un entorno de aceptación (staging)** con infraestructura equivalente al destino y datos anonimizados.
2. Ejecutar la UAT con operación y RR. HH. y registrar la evidencia.
3. Completar los P0/P1 de la sección 4 y las condiciones de la sección 5.
4. Emitir un **nuevo dictamen fechado** con la evidencia del entorno real. Solo entonces podrá declararse **GO de producción**.

---

## 8. Firmas

| Rol                      | Nombre | Decisión | Fecha |
| ------------------------ | ------ | -------- | ----- |
| Responsable técnico      |        |          |       |
| Responsable de operación |        |          |       |
| Responsable de RR. HH.   |        |          |       |
| Aprobación de dirección  |        |          |       |

---

**Documentos de referencia:** [Operación y preparación de producción](PRODUCTION.md) · [Desarrollo](DEVELOPMENT.md) · [Verificación operativa 17-11-2026](verification/2026-11-17-operational-readiness.md) · [Permisos por horas 18-11-2026](verification/2026-11-18-hourly-permissions.md)
