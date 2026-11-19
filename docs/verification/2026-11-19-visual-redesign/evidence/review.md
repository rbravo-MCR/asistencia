# Revisión independiente

Se pidió a un revisor de código revisar las fuentes actuales y el snapshot previo, los requisitos de la referencia de Empleados y la conservación de campos, permisos, CSRF, mutaciones, estados y foco.

## Hallazgo importante y corrección

El revisor identificó que `form.reset()` ocurría antes de las invalidaciones. React Hook Form limpia `isDirty` e `isSubmitting` al resetear, por lo que una recarga lenta podía habilitar campos y retirar el bloqueo de navegación antes del cierre; cambios nuevos se perderían.

Se reprodujo con un GET de empleados retenido después del POST. La prueba RED falla porque Nombre completo deja de estar deshabilitado. La corrección mueve el reset después de las invalidaciones, inmediatamente antes del cierre. La suite de diez pruebas pasa después de corregirlo.

El mismo revisor volvió a inspeccionar la corrección y el menú contextual posterior. No reportó nuevos fallos importantes. El menú sigue el patrón existente de Departamentos: la acción se ejecuta después de restaurar el foco del menú para no interferir con el foco del panel o confirmación.

## Propuesta integral

Un segundo pase de revisión, limitado a la propuesta integral, no encontró preguntas materiales adicionales para planificarla. La elección visual pendiente está explícita y no se sustituye por aprobación del revisor.
