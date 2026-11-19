# Etapa 17: dashboard y configuración administrativa

**Resultado: punto 1 terminado y verificado localmente. 339 pruebas aprobadas.** La app móvil se pospone al final.

## Entrega

Inicio autenticado con resumen personal y de equipo por alcance vigente; turno actual/nocturno y ventana de salida, marcajes aceptados, evaluaciones separadas, incidencias sin resolver, decisiones autorizadas, solicitudes pendientes, vacaciones personales por período y avisos sin leer exactos. Inicio público conservado; ingreso exitoso abre el dashboard y Mi cuenta sigue accesible.

`/configuracion` agrupa organización, asistencia, horarios, ubicaciones y ausencias. ADMIN dispone además de acceso a usuarios/auditoría. Diagnóstico de faltantes con enlaces, cantidades y separación entre advertencias e información revisable. `/configuracion/asistencia` reutiliza el formulario versionado anterior y mantiene el acceso desde Asistencia.

Contratos estrictos, endpoints autenticados sin caché, consultas públicas por módulo y sin efectos de negocio. Las respuestas no contienen motivos privados, evidencias, GPS ni secretos. No hay migraciones ni dependencias nuevas.

## Verificación

| Comprobación            | Resultado                                                                                      |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| `pnpm check`            | Salida 0: 170 pruebas unitarias/UI; lint, límites modulares, formato, tipos y build correctos  |
| `pnpm test:integration` | Salida 0: 139 pruebas PostgreSQL en 13 archivos                                                |
| Playwright completo     | Salida 0: 30 recorridos escritorio/móvil; `.last-run.json` passed sin fallos                   |
| Revisión independiente  | Dos P2 corregidos con regresiones observadas RED; revisión posterior sin otros P1/P2 concretos |

La integración nueva verifica HTTP401/403, datos sin empleado, diagnóstico sin cambios de auditoría, alcance propio/equipo/global, suplencia revocada, fecha civil de Mérida y nocturnos, turnos anteriores a activación, ausencia no inferida, motivo sin resolución, justificación posterior sin alterar marcajes, superior explícito sin jefatura y sin bypass ADMIN/HR, dirección revocada, ausencia aprobada sin crear controles, 105 avisos y guardado de valores nuevos de política con CSRF e historial conservado.

## Regresiones de revisión

- El intervalo enlazado del calendario usaba la columna del día 1 del mes aunque empezara el 17. Prueba UI falló con índice 13 en lugar de 8 para martes; corrección usa `from` y suite UI pasó.
- La jornada personal desaparecía al terminar el turno aunque siguiera abierta la ventana de salida. Prueba nocturna falló antes de ampliar candidatos hasta el máximo permitido y aplicar la política real.
- Un turno anterior en ventana de salida podía desplazar al turno actualmente programado. Regresión falló como único caso de 13; corrección prioriza el horario actual y suite PostgreSQL completa pasó.
- Las pruebas antiguas de ingreso esperaban Mi cuenta; se adaptan al inicio solicitado y conservan las comprobaciones de acceso a Mi cuenta, cierre con CSRF y denegación de escalamiento de roles.

## Datos y límites

Las pruebas nuevas de integración usan base PostgreSQL temporal propia terminada en `_test`. Playwright usa exclusivamente `TEST_DATABASE_URL`; conserva umbrales existentes al crear una versión de política para no cambiar reglas de otros recorridos. Su limpieza libera únicamente la referencia de su cuenta temporal, conservando versiones y snapshots. La integración aislada sí prueba valores diferentes.

No se cargaron ni modificaron responsables, turnos, políticas empresariales o saldos de desarrollo. No despliegue, certificación de producción, app móvil, biometría, offline, SMTP/push ni nómina. Se preserva el árbol sin seguimiento en `setup/base-tecnica`, sin commit inicial, push o publicación.

## Cierre de navegador

Se inspeccionaron capturas de dashboard de administrador y empleado en escritorio y celular. El empleado muestra turno vigente y saldo de un período de prueba; la cuenta sin períodos conserva el estado vacío. Las pantallas no presentan desbordamiento horizontal.

Una primera regresión completa detectó una expectativa antigua de Mi cuenta después del ingreso: 28/30 pasaron y dos variantes fallaron. Corregida la expectativa al dashboard, la siguiente ejecución reportó 30 aprobadas pero terminó con señal 143 al cerrar servidores; no se contó como comando exitoso. Se sustituyó el lanzador pnpm de Vite en Playwright por ejecución directa Node con cwd de la web. La prueba de arranque/cierre pasó 2/2 con salida 0 y la repetición completa final pasó 30/30 con salida 0, sin fallos en `.last-run.json` y con servidores de prueba cerrados.
