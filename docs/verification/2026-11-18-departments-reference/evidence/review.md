# Revisión independiente de lectura

review_departments no editó archivos ni ejecutó suites. No encontró fallos críticos y señaló dos importantes:

1. Cierre antes del refetch podía devolver foco al trigger de una fila ya eliminada. Se mantiene pending durante DELETE y GET, se cierra tras invalidación y se dirige el foco a búsqueda al confirmar; cancelar vuelve al trigger. Regresión unit RED y GREEN; E2E con DELETE real y GET retenido.
2. Deshabilitar useBlocker durante saving permitía perder texto y confirmación con Atrás/recarga. Ahora saving mantiene bloqueo y beforeunload incluso después de reset mientras se actualiza el listado. Regresión RED y GREEN, más E2E con PUT real retenido, recarga cancelada y Atrás protegido.

En la segunda lectura confirmó ambas correcciones sin nuevos Critical/Important. La evidencia funcional pertenece al implementador: unit-final.txt, review-red.txt, slow-writes.txt y e2e.txt. Se añadieron límites de altura/scroll en superficies flotantes y captura de nombre largo/landscape.
