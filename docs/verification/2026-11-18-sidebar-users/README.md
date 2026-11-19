# Sidebar MCR y directorio de Usuarios

Fecha: 18-11-2026. Corrección solicitada sobre el menú superior y la composición de Usuarios. [Spec](../../superpowers/specs/2026-11-18-sidebar-users.md) y [plan](../../superpowers/plans/2026-11-18-sidebar-users.md). Implementación acotada dentro del plan premium; no se presenta como rediseño completo del sistema.

## Resultado

- Sidebar negro MCR con logo original, grupos, iconos, selección amarilla, colapso y scroll independiente que mantiene visible la ruta actual. Encabezado compacto con ubicación, tema, avisos y cuenta. Drawer y accesos inferiores móviles con safe area.
- Usuarios pasa del listado/formulario en dos tarjetas a directorio de ancho completo: búsqueda local, filtros por rol/estado, cantidades calculadas del listado autorizado, tabla desktop y filas móviles. Sin paginación, estadísticas o operaciones masivas ficticias.
- Crear/editar usa un panel sólido accesible: foco inicial, Tab contenido, Escape, restauración y fallback de foco; validación, errores persistentes, pending sin doble envío, confirmación de cambios sin guardar y bloqueo de Atrás/recarga. Recovery sigue siendo temporal y ocultable.
- Header glass ahumado selectivo, con fallback opaco y reducción de transparencia. Tabla y formulario sólidos. Google Sans local y siete colores conservados. Sin otra biblioteca o dependencias nuevas.
- Se corrigió un destello del sidebar en el acceso mientras se verificaba sesión. Los E2E demoran la respuesta real del servidor y verifican que no aparezca navegación privada en ese estado.

## Verificación

| Comando / evidencia                                          | Resultado                                                                      |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| [pnpm check](evidence/check-final.txt)                       | Lint, arquitectura, formato, tipos, 186 pruebas unitarias/UI y build aprobados |
| [pnpm test:integration](evidence/integration.txt)            | 175 pruebas PostgreSQL aprobadas                                               |
| [Playwright completo](evidence/e2e.txt)                      | 70 pruebas aprobadas en escritorio/móvil                                       |
| [Guardas de borrador](evidence/navigation-dirty-green.txt)   | Atrás y recarga reales cancelados; texto conservado y guardado correcto        |
| [Revisión independiente](evidence/review.md)                 | Dos hallazgos corregidos y releídos                                            |
| [Preservación de fuentes](evidence/source-preservation.json) | 115 archivos protegidos intactos; mismas 22 rutas                              |
| [Producción y capturas](PERFORMANCE.md)                      | 8 recorridos de Usuarios, 21 cargas frías y comparación con la etapa anterior  |

Total de suite final: **431 pruebas**. Las revalidaciones parciales se conservan como evidencia y no se suman otra vez. Los fallos iniciales permitieron corregir pérdida de borrador, nombres de filtros y composición; los recorridos antiguos se adaptaron a abrir el nuevo menú móvil, sin quitar sus aserciones de negocio. La ejecución interrumpida se conserva separada y no se contabiliza como aprobada.

## Aceptación del alcance

Marca/tokens, claro/oscuro, responsive y foco comprobados en las vistas modificadas. Estados de carga, vacío general, filtros vacíos, error, guardando y resultado real conservados. Forbidden permanece en ProtectedPage y en servidor. Las pruebas preservan sesión/alcance, CSRF, GPS presencial y home office sin GPS, HEAD_ONLY/histórico, períodos/saldos, publicación y trazabilidad; backend, contratos, migraciones, paquetes, lockfile y .env no cambian. Solo se usan fixtures de `_test` en evidencia; no se añaden empleados, saldos ni políticas de demostración en desarrollo.

El encabezado pasa de 217 a 72 px en la referencia desktop; el coste de JS frente a tokens aumenta y se registra explícitamente, junto con LCP/CLS finales y metas pendientes. No equivale a aceptación integral de todas las pantallas, producción lista o WCAG certificado. Safari, lector real, teclado virtual y GPS físico no se certifican con Chromium emulado.

## Archivos principales

- components/layout/{navigation,sidebar,app-shell}: navegación tipada, permisos actuales y composición.
- components/ui/side-panel.tsx: panel reusable Radix con foco, Escape y retorno.
- app/root-layout.tsx: integración del shell y composición pública.
- features/identity/{users-page,user-form,users-directory}: orquestación, formulario y directorio separados.
- styles.css: header glass, fallback y safe area; pruebas de navegador y protección de superadministrador adaptadas al nuevo flujo.

Quedan pendientes el resto de componentes del punto 4, el rediseño específico de acceso/dashboard y los flujos operativos del plan completo. Esta entrega atiende sidebar y Usuarios según la corrección del usuario. El servidor local sigue en http://127.0.0.1:5173/usuarios con la cuenta de revisión existente.
