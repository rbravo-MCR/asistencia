# Revisión independiente

Revisor de lectura: review_sidebar. Sin cambios por parte del revisor ni suites ejecutadas por él. No identificó fallos críticos o regresiones de permisos/CSRF. Señaló dos defectos:

1. Importante: el panel protegía Escape/cancelación, pero Atrás y recarga podían perder un borrador. Se añadió useBlocker del router instalado, con beforeunload y confirmación mientras hay cambios; se excluye el guardado pendiente. Reproducción RED y GREEN real con Atrás/recarga cancelados en evidence/navigation-dirty-*.txt.
2. Menor corregido: al guardar bajo filtros podía desaparecer el disparador. SidePanel comprueba isConnected y devuelve foco a users-search cuando es necesario. La prueba edita el nombre hasta excluir la fila y verifica el foco.

En su segunda lectura confirmó ambos cambios y no encontró otro defecto importante. La prueba funcional es del implementador y la suite final completa. El ajuste posterior del acceso público evita mostrar sidebar al verificar sesión en ingresar/recuperar; cuenta con comprobación de navegador y regresión propia, sin atribuir esta última modificación al revisor.
