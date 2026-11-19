# Sistema visual MCR

**MCR · Sistema de asistencia | Directrices de implementación | 18-11-2026**

## Identidad y composición

Logo sin deformar ni recolorear, con espacio libre mínimo de 16 px (propuesta). Fondo oscuro si el recurso tiene letras blancas; verifica variante real antes de usar sobre blanco. No crear una marca MCR People como nombre oficial sin aprobación. Google Sans en toda la UI, números tabulares si la fuente los soporta; fallback system-ui.

## Lenguaje visual

| Elemento          | Regla                                                    |
| ----------------- | -------------------------------------------------------- |
| Navegación        | Negra, activa amarilla con texto negro, icono y etiqueta |
| Contenido         | Blanco o neutro tenue en claro; carbón en oscuro         |
| Acción primaria   | Amarillo con texto negro, sin gradiente                  |
| Acción secundaria | Fondo neutro y borde discreto                            |
| Destructiva       | Rojo accesible, confirmación contextual                  |
| Datos             | Tablas con líneas suaves y densidad controlada           |
| Énfasis           | Tipografía, posición y espacio antes que color           |

## Escala y geometría

Base 4 px; espacios 4/8/12/16/24/32/40/48. Radios 8 controles, 12 paneles, 16 superficies destacadas, 24 solo hero/login. Sombras discretas; evitar tarjeta dentro de tarjeta. Títulos 28–32 desktop, 24 móvil; sección 20, cuerpo 14–16, auxiliar 12–13. Interlineado 1.4–1.6; no encoger textos para hacerlos caber. Iconos Lucide 18–24 con grosor consistente; no reemplazar etiquetas imprescindibles.

## Tema y estados

Claro, oscuro y sistema; persistir solo preferencia no sensible. Aplicar antes del primer pintado para evitar destellos. Tokens de 02 como única fuente. Hover, focus-visible, active, disabled, pending, invalid y selected deben ser distinguibles en ambos temas. Estados semánticos con texto e icono, nunca solo color. Verificar contraste sobre superficies reales.

## Densidad

Tablas operativas: filas 48–56 px, encabezado fijo cuando aporta. Formularios con campos agrupados, etiquetas permanentes y ayuda contextual. No usar paneles gigantes para cifras aisladas. Dashboard sin gráficos ornamentales. Desarrollar un espécimen local de componentes en entorno de desarrollo, no ruta pública de producción.

## Aceptación

Comparar capturas de login, dashboard, asistencia y calendario en ambos temas; mismo ritmo espacial, tipografía y estados. El amarillo debe dirigir acciones, no competir con ellas. No quedan colores de marca antiguos en componentes.
