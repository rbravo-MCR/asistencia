# Accesibilidad WCAG 2.2 AA

**MCR · Sistema de asistencia | Directrices de implementación | 18-11-2026**

## Objetivo verificable

WCAG 2.2 AA para pantallas y flujos incluidos; Lighthouse no constituye certificación. Contraste texto normal ≥4.5:1, grande ≥3:1 y componentes/indicadores necesarios ≥3:1. Amarillo con negro. Estados no dependen del color. Probar ambas variantes de tema, glass y fallback.

## Semántica y navegación

Landmarks header/nav/main/footer, un h1 por vista, niveles lógicos. Conservar enlace Saltar al contenido ya existente. `aria-current=page` en ruta activa. Botones para acciones y links para navegación; no div clicable. Foco visible sin quedar oculto. Orden DOM coincide con lectura. Diálogos con nombre accesible, foco inicial y restauración; Escape en contextos no destructivos. Command Palette no captura atajos mientras se escribe de modo inesperado; ofrecer botón visible y alternativa móvil.

## Formularios y datos

Label asociado, instrucciones antes de entrada, `aria-describedby` para ayuda/error, `aria-invalid` donde corresponde. Mensajes en español mexicano, identificar reparación. Autenticación permite pegar/autocompletar contraseña y gestores. Tablas con th y scope, captions útiles, `aria-sort` donde proceda. No anunciar datos privados innecesariamente. Avisos leves en live region polite, error urgente cuando necesario; reloj sin anuncio periódico.

## Gestos y tamaños

Alternativa a arrastre con formulario; todo operable por teclado, sin trampa de foco. Objetivo táctil interno 44 px, respetar WCAG de mínimo 24 CSS px o excepciones aplicables. Reflow 320 CSS px salvo contenido bidimensional justificado. Texto ampliable. Reduced motion, forced colors y efectos reducidos sin pérdida de funciones.

## Evidencia

Pruebas automáticas existentes y análisis accesible (herramienta adicional solo tras aprobación); recorrido manual teclado, lector de pantalla en login/asistencia/aprobaciones/calendario y revisión de contraste. Registrar criterio, ruta, evidencia y defectos. No afirmar conformidad completa solo por score automático.
