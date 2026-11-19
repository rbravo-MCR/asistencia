# Flujos críticos y reglas de interacción

**MCR · Sistema de asistencia | Directrices de implementación | 18-11-2026**

## A. Marcaje presencial

Abrir jornada → confirmar turno asignado → solicitar GPS fresco al realizar acción → mostrar estado de precisión/geocerca → enviar payload existente con UUID → evaluar `attempt.accepted` → confirmación real o rechazo con código/motivo aplicable. No prometer validación definitiva antes de respuesta. Si resultado desconocido, conservar UUID y payload exactos en el mecanismo actual, permitir reintento seguro. Un clic principal más permisos del navegador cuando sean necesarios.

## B. Home office

Mismo flujo sin solicitar permiso GPS, sin coordenadas, sin mostrar mapa ni indicador ficticio de geocerca. `geoCheckId:null` es esperado. No pedir biometría. Hora de servidor manda; reloj local es orientativo. Si `REASON_REQUIRED`, abrir incidencia correspondiente y conservar motivo al fallar; guardar motivo no equivale a aprobación. Rechazo HTTP 200 debe verse como rechazo; retardo aceptado es marcaje con incidencia, no entrada fallida.

## C. Planificación

Elegir rango/empleado autorizado → borrador con plantilla y centro si presencial → comprobar datos → guardar → confirmar publicación → actualizar agenda/avisos. En arrastre, anunciar origen/destino y permitir cancelar; solo guardar al confirmar. Manejar 409 sin perder contexto. Operativo solo HOME_OFFICE y administrativo ONSITE según contrato actual. No cambiar modalidad libremente. Turno nocturno conserva workDate de inicio.

## D. Vacaciones

Elegir período concedido → fechas civiles válidas → motivo y evidencia si aplica → mostrar condiciones y saldo del servidor → confirmar envío. No inventar cálculo definitivo; si se muestra estimación, etiquetarla. Reserva reduce disponible; aprobación consume; rechazo/retiro libera; cancelación futura aprobada devuelve una vez. Sin período, explicar y dirigir al responsable, no mostrar cero inventado.

## E. Permiso por horas

Seleccionar tipo → mostrar goce y restricciones vigentes → capturar intervalo de ausencia (no tiempo trabajado) → motivo → enviar. Entrada tardía/salida anticipada configuradas en dev con 24 h, exactamente 24 válida por hora servidor; mostrar error `INSUFFICIENT_NOTICE` o `PARTIAL_REQUIRED`. No fijar 17:00 para todos los turnos ni imponer anclaje a turno que API no exige. No calcular nómina.

## F. Aprobaciones

Abrir detalle autorizado → mostrar política/snapshot y paso actual → verificar `canDecide` → motivo obligatorio → confirmar → actualizar resultado. HEAD_ONLY nuevo definitivo por jefatura; HEAD_DIRECTOR histórico conserva dos pasos. Sin autoaprobación ni autoridad por rol técnico; revalidación servidor decide si cambió responsabilidad. Cancelación aprobada solo futura; resolución conserva historial original.

## G. Cambio de sesión

Usuario sale o sesión expira → limpiar caché y estado privado → login → volver solo a ruta interna permitida si mecanismo actual lo admite. No reenviar automáticamente operaciones sensibles tras reautenticar. Nunca mostrar datos del usuario anterior.

## Aceptación

Probar todos los caminos feliz, error de validación, 403, conflicto, red desconocida y reintento. Ningún mensaje de éxito antes de servidor. Conservar historial e identidad de actor.
