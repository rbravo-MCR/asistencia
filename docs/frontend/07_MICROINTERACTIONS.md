# Motion y feedback

**MCR · Sistema de asistencia | Directrices de implementación | 18-11-2026**

## Principios

Movimiento informa, no adorna. Usar CSS y `tw-animate-css` existentes; librería adicional solo con autorización y evidencia. Duraciones propuestas: hover 150 ms, panel 220 ms, confirmación 250 ms. Curva `cubic-bezier(.2,.8,.2,1)`; animar opacity/transform, no layout global. No animar números de KPIs hasta valores falsos.

| Evento              | Respuesta                                               |
| ------------------- | ------------------------------------------------------- |
| Hover/focus         | Borde/contraste y foco visible inmediato                |
| Navegación          | Cambio breve de contenido, sin retrasar foco            |
| Carga               | Skeleton de dimensiones estables o spinner con etiqueta |
| Envío               | Estado pendiente y bloqueo de duplicado                 |
| Marcaje aceptado    | Check + hora del servidor + estado real                 |
| Marcaje rechazado   | Mensaje persistente y acción de recuperación            |
| Error de formulario | Campo identificado, resumen si procede                  |
| Drag & drop         | Vista destino, confirmación, restaurar al fallar        |
| Aviso               | Conteo real y anuncio discreto                          |

## Reglas de feedback

No usar toast como único canal de información crítica. No ocultar automáticamente errores que requieran acción. Confirmación de asistencia sigue visible en la jornada. No anunciar reloj cada segundo al lector de pantalla. Nunca celebrar un rechazo o confundir HTTP 200 con éxito. No usar vibración como requisito.

```css
@media (prefers-reduced-motion: reduce) {
  .motion-optional {
    animation: none;
    transition: none;
    scroll-behavior: auto;
  }
}
```

Aplicar a todos los efectos propios; equivalentes estáticos conservan significado. No alterar animaciones indispensables de terceros sin verificar comportamiento. Evitar destellos, parallax y fondos en bucle.

## Aceptación

Teclado y toque no requieren esperar una animación. Feedback visible mientras la operación está pendiente. Pruebas con reduced motion, red lenta y doble clic; cero duplicación de envíos por interacción.
