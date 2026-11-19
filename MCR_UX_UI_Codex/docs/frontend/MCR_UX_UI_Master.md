# MCR · Guía integral UX/UI para Codex

# Dirección maestra UX/UI

**MCR · Sistema de asistencia | Directrices de implementación | 18-11-2026**

## Mandato para Codex

Actúa como arquitecto frontend y diseñador de producto senior. Construye una experiencia corporativa excepcional, no una plantilla shadcn. La rapidez, claridad, accesibilidad y confianza tienen prioridad sobre cualquier efecto visual. Conserva las funciones actuales; no simules datos ni cambies reglas para acomodar la interfaz.

## Fuentes y precedencia

Lee `docs/AGENTS.md`, `docs/PROMPT MAESTRO PARA CODEX.md`, `docs/POLÍTICA OBLIGATORIA DE VERSIONES TECNOLÓGICAS.md`, `docs/arquitectura_y_ regla_de_negocio.md`, `docs/api/*.md` y los contratos en `packages/contracts/src/`. Contrasta con las especificaciones del 17 y 18 de noviembre. Si existe discrepancia entre código, contratos y documentación, registra el conflicto y no lo resuelvas modificando negocio silenciosamente. Estas guías reemplazan únicamente la propuesta visual anterior.

## Dirección artística

Negro #000000, amarillo #FADB25, blanco #FFFFFF, tierra #2B261A, azul #1275B5, verde #67CF55 y rojo #B81111. Google Sans. Logo original `assets/logo-MCR (1).png` o variante existente `assets/logo_mcr.webp` tras verificar fidelidad. Negro y amarillo como firma visual; superficies neutras para trabajo intensivo. Glassmorphism ahumado con moderación. No usar verde petróleo anterior.

## Experiencias

- Empleado: jornada y acción principal visibles al entrar; agenda, solicitudes, saldo y avisos en segundo nivel.
- Jefatura: pendientes que realmente puede decidir, equipo autorizado, agenda e incidencias.
- Dirección: lectura agregada y detalles autorizados; no inventar permisos.
- ADMIN/HR/SUPER_ADMIN: diagnóstico, gestión y configuración conforme a capacidades del servidor.

## Principios operativos

Cada vista responde qué ocurre, qué importa y qué hacer después. Indicadores enlazan a detalles reales. Una acción primaria por contexto. Preservar filtros, foco y posición al volver. Mostrar resultado verificado, no éxito decorativo. No bloquear toda la pantalla durante una mutación localizada.

## Plan obligatorio

1. Inventariar rutas, estados y pruebas; levantar baseline visual/performance.
2. Tokens y primitivas; comprobar contraste y temas.
3. Shell responsivo, login y dashboard; preservar rutas y permisos.
4. Asistencia móvil, incidencias y motivos; verificar idempotencia.
5. Calendario y turnos; después expedientes, solicitudes y aprobaciones.
6. Configuración, auditoría, avisos y pulido final.
7. Ejecutar gates por fase; cambios pequeños y reversibles, sin migraciones no autorizadas.

## Alcance

Obligatorio: rediseño de las rutas existentes. Propuestas sujetas a validación: búsqueda global de entidades, duplicación/operaciones masivas, reportes nuevos, exportación, PWA, biometría, offline, soporte y expediente documental. No instalar paquetes ni crear API sin justificar y obtener autorización conforme a políticas del repositorio. La navegación por comandos locales de rutas autorizadas sí puede construirse sin API nueva.

Consulta los documentos 01–14 para los contratos visuales y aceptación. Al finalizar cada fase entrega archivos modificados, pruebas ejecutadas, evidencia visual, mediciones, riesgos y funcionalidades pendientes. No declares listo lo que no probaste.

---

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

---

# Tokens y tipografía

**MCR · Sistema de asistencia | Directrices de implementación | 18-11-2026**

## Integración

`apps/web/src/styles.css` usa Tailwind 4 `@theme inline` y variables semánticas. Evolucionar esa interfaz; no duplicar sistemas. Ejemplo inicial, ajustar contraste tras pruebas:

```css
:root {
  --mcr-black: #000000;
  --mcr-yellow: #fadb25;
  --mcr-white: #ffffff;
  --mcr-earth: #2b261a;
  --mcr-blue: #1275b5;
  --mcr-green: #67cf55;
  --mcr-red: #b81111;
  --background: #f6f7f8;
  --foreground: #171717;
  --card: #ffffff;
  --primary: var(--mcr-yellow);
  --primary-foreground: var(--mcr-black);
  --secondary: #efeff1;
  --muted-foreground: #52525b;
  --border: #d4d4d8;
  --ring: #1275b5;
  --success-text: #236b29;
  --warning-text: #805600;
  --info-text: #125c91;
  --danger-text: #b81111;
  --surface-solid: #ffffff;
  --duration-fast: 150ms;
  --duration-normal: 220ms;
}
[data-theme='dark'] {
  color-scheme: dark;
  --background: #101010;
  --foreground: #fafafa;
  --card: #1b1b1b;
  --secondary: #272727;
  --muted-foreground: #b5b5be;
  --border: #505050;
  --ring: #fadb25;
  --success-text: #67cf55;
  --warning-text: #fadb25;
  --info-text: #8cc9f1;
  --danger-text: #ff9999;
  --surface-solid: #1b1b1b;
}
@theme inline {
  --font-sans: 'Google Sans', ui-sans-serif, system-ui, sans-serif;
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-ring: var(--ring);
  --color-destructive: var(--danger-text);
}
```

Conservar mappings existentes de card, foreground, accent, input y muted. Unificar tema con variante dark de Tailwind si se utiliza; no mezclar selectores incompatibles. Los colores complementarios son propuestas, no ampliación de marca oficial. Amarillo y verde brillante no como texto sobre blanco; variantes semánticas deben contrastar.

## Fuente oficial

URL suministrada: https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700
Verificar licencia y disponibilidad antes de copiar archivos de fuente; preferir WOFF2 local autorizado con `font-display: swap`. Si se usa URL externa, revisar CSP, privacidad y rendimiento; sin bloquear render por la fuente. Pesos 400/500/600/700; itálica solo cuando procede. No inventar archivos de fuente. Medir CLS por fallback.

## Aceptación

Sin hex de marca dispersos en features; colores de negocio se resuelven mediante variantes semánticas. Probar contrastes AA, foco, disabled y colores en modo alto contraste. No todos los bordes decorativos requieren 3:1, pero los límites funcionales necesarios sí.

---

# Biblioteca de componentes y patrones

**MCR · Sistema de asistencia | Directrices de implementación | 18-11-2026**

## Base existente

Reutilizar `components/ui/{button,input,label,badge,card,table}.tsx`, Radix y utilidades existentes. Extender variantes con CVA y utilidades Tailwind. No crear otra copia de Button ni instalar una segunda biblioteca.

| Componente propuesto        | Contrato de UX                                             |
| --------------------------- | ---------------------------------------------------------- |
| AppShell / Sidebar / Header | Rutas tipadas, permisos vigentes, estado activo, colapso   |
| PageHeader                  | Título, descripción opcional, acción principal             |
| StatusBadge                 | Estado explícito, icono opcional, variante semántica       |
| DataTable                   | Encabezados accesibles, vacíos/error, navegación y filtros |
| FilterBar                   | Filtros activos, limpiar, rango real validado              |
| FormField                   | Label, descripción, error ligado por ID                    |
| Dialog / Sheet              | Foco atrapado, Escape, regreso al disparador               |
| ConfirmAction               | Efecto, entidad, motivo si contrato lo exige               |
| AsyncState                  | loading/error/empty/forbidden con reintento apropiado      |
| Toast / InlineNotice        | Feedback no duplicado; errores persistentes en contexto    |
| MetricLink                  | Valor, definición, destino real o detalle                  |
| CommandPalette              | Rutas/acciones permitidas, teclado y búsqueda              |
| AttendanceAction            | Estado desde API, pending y resultado aceptado/rechazado   |
| GlassSurface                | Variantes limitadas por documento 04                       |

## Interfaces

Primitivas reciben props visuales y accesibilidad; patrones reciben datos ya preparados. No efectuar fetch ni decidir permisos dentro de Button o Badge. Componentes de feature orquestan queries/mutations. No pasar todo el objeto sesión cuando basta un permiso. Preferir composición a flags booleanos combinatorios.

## Estados de interacción

Botones pending conservan anchura y texto comprensible; impedir doble envío sin ocultar estado. Inputs con valores controlados según patrón actual; no perder texto al fallar. Dialog de cambios sin guardar solo si realmente existen cambios. Escape no elimina información silenciosamente. Tablas no inventan paginación de servidor; usar real si endpoint la admite (auditoría). Para listado local, indicar alcance y cantidad real.

## Pruebas

Testing Library por rol/nombre accesible, no clases CSS. Pruebas de teclado, foco, error y disabled/pending. Capturas visuales de variantes claras/oscuras. No duplicar lógica de negocio en un componente genérico.

---

# Glassmorphism Black & Gold

**MCR · Sistema de asistencia | Directrices de implementación | 18-11-2026**

## Uso autorizado

| Superficie                                | Intensidad | Restricción                                    |
| ----------------------------------------- | ---------- | ---------------------------------------------- |
| Login                                     | Alta       | Fondo abstracto CSS; formulario legible        |
| Header sticky                             | Media      | Una capa; fallback opaco                       |
| Sidebar                                   | Baja       | Preferir negro sólido si no aporta profundidad |
| Hero dashboard                            | Media-alta | Solo una superficie protagonista               |
| Reloj / confirmación de asistencia        | Media      | Sin perjudicar acción ni estado                |
| Command palette / popover avisos          | Media      | Contraste independiente del fondo              |
| Bottom navigation móvil                   | Baja-media | Safe area y botones claros                     |
| Tablas, formularios, calendario, reportes | Ninguna    | Superficies sólidas                            |

## Implementación propuesta

```css
.glass-surface {
  background: var(--surface-solid);
  border: 1px solid var(--border);
  border-radius: 16px;
}
@supports (backdrop-filter: blur(1px)) {
  .glass-surface {
    background: rgb(255 255 255 / 88%);
    backdrop-filter: blur(12px) saturate(115%);
  }
  [data-theme='dark'] .glass-surface,
  .glass-surface--smoked {
    background: rgb(20 20 20 / 88%);
    border-color: rgb(250 219 37 / 18%);
  }
}
@media (prefers-reduced-transparency: reduce), (forced-colors: active) {
  .glass-surface {
    backdrop-filter: none;
    background: var(--surface-solid);
  }
}
[data-effects='reduced'] .glass-surface {
  backdrop-filter: none;
  background: var(--surface-solid);
}
```

La variante ahumada necesita tokens de texto claro incluso en tema claro y fallback oscuro explícito. No usar blur como filtro de privacidad. Verificar composición y contraste sobre el fondo más adverso. Las preferencias del navegador no están soportadas por todos: incluir opción de efectos reducidos si se implementa configuración visual.

## Rendimiento

No animar `backdrop-filter`, sombras grandes ni gradientes continuos. Evitar capas de blur anidadas y blur en filas. Probar scroll con header fijo y calendario en equipo modesto. Si se degrada, quitar blur antes de reducir funciones. No usar vídeo ni WebGL para el login.

## Aceptación

Fallback sin soporte mantiene legibilidad y dimensiones. Con reducción de efectos no cambia el orden de foco, acciones ni estados. La marca no pierde identidad aun desactivando todos los efectos.

---

# Planos de pantallas y navegación

**MCR · Sistema de asistencia | Directrices de implementación | 18-11-2026**

## Shell y rutas existentes

Modificar `app/root-layout.tsx`, no sustituir TanStack Router. Sidebar desktop: Inicio, operación (Calendario, Asistencia, Incidencias), personal (Empleados, Departamentos, Responsables), solicitudes (Solicitudes, Aprobaciones, Vacaciones), avisos, configuración y cuenta. Mostrar navegación por capacidades sin inventar una matriz distinta del backend. Header con breadcrumb, búsqueda local de rutas, campana y cuenta. Móvil: Inicio, Jornada, Calendario y Más (acceso a las rutas permitidas). Mantener `/estado` donde proceda.

| Ruta real                   | Plano visual y acción                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `/ingresar`                 | Logo original, panel glass ahumado, identificador + clave existentes, mostrar clave, recuperación, enviar          |
| `/recuperar`                | Código/token y nueva clave según contrato, instrucciones sin prometer correo                                       |
| `/`                         | Jornada propia primero para empleado; para responsables, resumen y pendientes autorizados; enlaces con filtro real |
| `/asistencia`               | Reloj orientativo, turno actual, acción ENTRY/EXIT válida, verificación GPS solo presencial, historial y resultado |
| `/incidencias`              | Filtros de rango, agrupación empleado/turno, evaluación original, motivo y resolución separados                    |
| `/calendario`               | Mes y agenda existentes, navegación temporal, chips de estado y modalidad, editor de borrador y confirmación       |
| `/turnos`                   | Plantillas, horarios, días, modalidad, versión y estado; edición sin alterar publicados                            |
| `/empleados`                | Directorio por alcance, búsqueda visible, panel de edición de expediente, proteger cuentas privilegiadas           |
| `/departamentos`            | Lista y alta/edición autorizadas; errores de referencias visibles                                                  |
| `/responsables`             | Asignaciones con vigencia, historial/revocación, claridad de titular y suplente                                    |
| `/solicitudes`              | Historial propio/alcance, creación por tipo, campos condicionados y evidencia según contrato                       |
| `/aprobaciones`             | Bandeja priorizada, detalle y motivo de decisión; solo `canDecide` habilita acciones                               |
| `/vacaciones`               | Períodos separados, concedido/reservado/disponible/aprobado/disfrutado, movimientos; sin saldo ficticio            |
| `/avisos`                   | Bandeja propia, no leídos, marcar uno/todos y enlace interno seguro                                                |
| `/ubicaciones`              | Centros y autorizaciones vigentes, precisión/radio configurados; no tracking de personas                           |
| `/configuracion`            | Grupos de configuración y diagnóstico accionable con severidad real                                                |
| `/configuracion/asistencia` | Política y tolerancias editables; advertir que solo afectan controles nuevos                                       |
| `/politicas-ausencias`      | Versiones, goce, evidencia, horas obligatorias y anticipación                                                      |
| `/usuarios`                 | Gestión según privilegios, recovery seguro; no exponer secreto persistentemente                                    |
| `/auditoria`                | Tabla paginada y detalle antes/después sanitizado, fecha y actor                                                   |
| `/cuenta`                   | Perfil y cambio de clave según contrato; cerrar sesión                                                             |
| `/estado`                   | Estado técnico sin secretos; respetar protección vigente                                                           |

## Dashboard exacto

Usar `GET /api/dashboard`: fecha civil servidor, hora de generación, resumen diario, jornada, incidencias, solicitudes, saldo por período y conteo exacto de avisos. No sumar indicadores que representan dimensiones superpuestas. `evaluation:null` no equivale a falta. Actividad en vivo, porcentajes de puntualidad y reportes nuevos solo si contratos/datos sustentan las métricas; no inventar series. Mostrar vacío cuando no existe jornada o periodo. No poner motivos privados ni GPS en resumen.

## Calendario premium

Borradores movibles mediante drag & drop existente, con confirmación y alternativa por formulario. Publicados son de solo lectura para edición; cancelación con motivo y nuevo borrador cuando corresponda. Guardias, festivos y conflictos se validan en servidor. Semana visual, duplicación y acciones masivas son mejoras propuestas: diseñar después de validar contratos; no aparentar atomicidad con múltiples writes.

## Límites

No crear rutas de reportes, soporte, biometría, expediente documental ni app offline como si existieran. La vista móvil es web responsiva. Todos los diseños preservan los campos y acciones actuales; no esconder errores ni romper enlaces existentes.

---

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

---

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

---

# Diseño responsivo y experiencia móvil

**MCR · Sistema de asistencia | Directrices de implementación | 18-11-2026**

## Layouts

320 px como mínimo de reflow accesible; diseño de referencia 360/390, tablet 768/1024, desktop 1280/1440. Sidebar completa desde 1280, colapsable en desktop; drawer en tamaños intermedios y navegación inferior móvil para funciones principales. Breakpoints son propuestas, ajustar según contenido, no agente de usuario. Mantener una sola aplicación y router.

## Comportamiento

- `min-width: 0` en flex/grid; evitar overflow global. Dashboard 1→2→4 columnas según espacio real.
- Header compacto; búsqueda en diálogo móvil; filtros en sheet accesible con estado aplicado.
- Tablas densas: priorizar columnas o vista tarjetas con datos esenciales y acceso a detalle; scroll horizontal local cuando tabla bidimensional lo requiera. No ocultar campos críticos sin alternativa.
- Calendario: agenda móvil como alternativa al mes; edición por formulario en vez de exigir gesto de arrastre.
- Formularios de una columna en móvil; diálogos largos con scroll y footer que no tape foco.
- Acciones táctiles preferidas 44–48 px; espacio suficiente. Safe areas con `env(safe-area-inset-bottom)` y padding de contenido para barras fijas.
- Usar `100dvh` con fallback cuando aplique; revisar teclado virtual, landscape y zoom. No bloquear zoom.

## Jornada

Acción principal accesible sin scroll innecesario; horario, modalidad y estado de marcaje visibles. Mostrar errores de GPS únicamente cuando corresponda. Sin permiso de ubicación, explicar recuperación sin fingir marcaje. No solicitar ubicación en home office.

## Alcance

No PWA, service worker, offline ni biometría en esta fase; son etapas posteriores de proyecto. No almacenar datos privados para fingir operación sin red.

## Matriz de revisión

320/360/390/768/1024/1280/1440; claro/oscuro; teclado virtual; zoom 200% y reflow a 320 CSS px; Chromium y prueba manual Safari/Firefox cuando disponibles. Verificar que foco y botones no queden bajo header/bottom nav. Incluir teléfono real para GPS; permisos emulados no certifican precisión física.

---

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

---

# Presupuesto de rendimiento

**MCR · Sistema de asistencia | Directrices de implementación | 18-11-2026**

## Metas propuestas, no mediciones actuales

| Métrica                  | Meta                                         |
| ------------------------ | -------------------------------------------- |
| Lighthouse Performance   | ≥95 en perfil acordado                       |
| Lighthouse Accessibility | ≥95, sin fallos críticos                     |
| LCP                      | ≤2.5 s                                       |
| INP                      | ≤200 ms                                      |
| CLS                      | ≤0.1                                         |
| JS inicial comprimido    | objetivo inicial ≤200 KiB, sujeto a baseline |
| CSS inicial comprimido   | objetivo inicial ≤50 KiB, sujeto a baseline  |

Core Web Vitals de campo se evalúan al percentil 75 con datos suficientes; en entorno local LCP/CLS son laboratorio e INP requiere eventos reales o RUM. No sustituir INP por TBT como si fueran iguales. Medir build producción, no Vite dev. Establecer baseline antes de fijar límites definitivos de bundle; no ocultar regresiones.

## Estrategia

Vite y React existentes; lazy routes por feature pesado si mejora medición y conserva rutas tipadas. Evitar importaciones globales de calendario, charts o editor. No instalar gráficos si datos se entienden con cifras/tablas. Usar iconos importados individualmente. Logo WebP existente si fiel. Fuente WOFF2 autorizada, solo pesos necesarios. No vídeo ni efectos continuos. Reservar tamaño de skeletons, logo y gráficos.

TanStack Query: claves por alcance y parámetros; invalidaciones existentes tras write; no polling agresivo; no cachear indiscriminadamente endpoints `no-store` en persistencia. Prefetch solo rutas oportunas y autorizadas. Mantener recarga manual y al regresar conforme a dashboard. No duplicar lógica de servidor. Paginación real donde exista; para 30 empleados no virtualizar por moda.

## Protocolo

Registrar dispositivo, navegador, perfil CPU/red, commit, tamaño gzip/brotli y ruta. Tres corridas frías producción por login/dashboard/asistencia; mediana y peor caso. Probar scroll calendario, apertura de panel y marcaje en teléfono modesto; medir interacciones y tareas largas. Separar tiempo de permisos GPS/red/backend de latencia visual. Sin credenciales reales en logs. Si falla meta, registrar causa, propuesta y aprobación antes de cerrar fase.

## Gate

No regresión relevante sin explicación y aceptación; evitar deuda de bundle. Mantener estabilidad en red lenta y desactivar blur costoso antes de sacrificar funciones. Los scores y presupuestos no son garantías de dispositivos reales.

---

# Arquitectura frontend y reglas de implementación

**MCR · Sistema de asistencia | Directrices de implementación | 18-11-2026**

## Base inspeccionada

Monorepo pnpm; `apps/web` React 19.3.1, TanStack Router 1.170.46, Query 5.107.1, Vite 8.3.8, Tailwind 4.3.5, shadcn CLI 4.23.0, Radix, CVA, RHF, Zod y Lucide. Versiones son las declaradas en el ZIP, no verificación de últimas versiones ni instalación. API Fastify + Drizzle/PostgreSQL; TypeBox en `packages/contracts`. Node/pnpm según `.nvmrc` y `package.json`. Mantener lockfile.

## Evolución propuesta (sin reestructuración masiva)

```text
apps/web/src/
  app/                 # providers, router, root-layout
  components/
    ui/                # primitivas actuales
    patterns/          # patrones reutilizables nuevos cuando se necesiten
    layout/            # shell, sidebar, header
  features/            # conservar módulos actuales
    identity/ departments/ employees/ attendance/
    planning/ requests/ dashboard/ configuration/
    locations/ notifications/ audit/ system/
  lib/                 # API, utilidades, rangos
  pages/               # adaptadores de rutas
  styles.css           # entrada de tokens
```

Añadir `design-system/` solo si tamaño justifica separación; no duplicar `components/ui`. SRP, SOLID, DRY, KISS, cohesión y bajo acoplamiento. No usar patrones de backend artificialmente en UI. Feature posee orquestación; componentes puros presentan. Dependencias dirección app/pages→features→primitivas/lib; sin ciclos ni importación privada cruzada. Revisar `.dependency-cruiser.cjs` antes de cambiar carpetas y mantener `pnpm check:boundaries`.

## Estado y contratos

TanStack Query para servidor; estado local React para UI; URL para filtros compartibles donde router los admite. RHF/Zod para UX, TypeBox/API autoridad; no duplicar reglas críticas. `lib/api.ts`, sesión y mutaciones existentes son puntos de integración; mantener CSRF y manejo de errores. No añadir Redux ni cliente HTTP paralelo. Rutas `/asistencia`, `/incidencias`, `/calendario` conservan from/to inclusivos de máximo 93 días y fallback actual.

## Adopción incremental

Primero cambiar tokens y layout; probar rutas existentes. Después extraer patrones al identificar repetición real. Cada PR/fase pequeña con diff y pruebas. No alterar archivos backend/contracts, migraciones ni `.env` por rediseño sin aprobación expresa. No instalar Motion, dnd-kit, Recharts o TanStack Table automáticamente: no se declaran en dependencias del ZIP y drag & drop ya existe.

## Gate

TS estricto, sin `any` injustificado, sin supresiones para pasar build. `pnpm check`; revisar dependencias y lockfile. Documentar decisiones y excepciones en ADR conforme a AGENTS.

---

# Seguridad, privacidad y gobernanza

**MCR · Sistema de asistencia | Directrices de implementación | 18-11-2026**

## Fuente de verdad

Backend autoriza; ocultar menús no es autorización. Preservar guardas, `use-session`, `protected-page`, cliente HTTP y permisos existentes. Roles SUPER_ADMIN/ADMIN/HR/EMPLOYEE combinables; jefatura, suplencia y dirección son asignaciones vigentes. `canDecide` determina decisión. SUPER_ADMIN técnico no otorga autoridad laboral. No elevar privilegios desde UI. Proteger último SUPER_ADMIN y cuentas privilegiadas según API.

## Sesión y datos

Cookie HttpOnly, SameSite Strict, Secure en producción, sin tokens localStorage/JWT. Writes con `x-csrf-token` y Origin validado; preservar mecanismos existentes. Logout/revocación/cambio de cuenta limpia Query cache y estado privado. No persistir tokens, GPS, evidencias, motivos, datos de contacto ni respuestas de API en almacenamiento del navegador, analytics o logs. Preferencias visuales no sensibles sí pueden persistir. No renderizar HTML sin sanitizar; React escaping por defecto.

## Marcajes y operaciones

UUID/payload exactos ante resultado desconocido; 409 conflicto no se oculta. Validar `attempt.accepted`. Hora servidor, no modificar eventos originales. Home office no GPS; presencial solicita ubicación fresca en marcaje y servidor valida centro/precisión. No geolocalización en fondo. Permisos de ubicación se explican antes de solicitar. No usar coordenadas personales en dashboards.

## Evidencias y privacidad

Hasta 3 archivos de 1 MiB binario cada uno, PDF/PNG/JPEG; servidor valida firma y MIME. No cambiar límite, no guardar en rutas públicas, no ofrecer preview inline de archivo privado si contrato descarga como attachment. No enviar razones/archivos por notificaciones. Recuperación muestra código una vez, no autosave ni logs. Error usuario sanitizado; requestId cuando útil para soporte, sin stack trace.

## Gobernanza

Auditoría inmutable y outbox transaccional existentes. No sustituir por logs del navegador, no crear auditoría ficticia. Avisos internos, sin promesa correo/SMS/push. Preservar snapshots y fechas UTC/civiles según contrato. Configuración nueva no reescribe registros previos. No copiar datos reales a fixtures/screenshots.

## Gates

Verificar 401/403/404 alcance, CSRF, doble envío, cambio/expiración sesión, enlaces internos y datos ausentes en respuestas. Prueba directa de rutas sin permisos. Cambios de seguridad, negocio, dependencias y contratos requieren revisión explícita. No desactivar controles para hacer funcionar una demo.

---

# Pruebas y regresión frontend

**MCR · Sistema de asistencia | Directrices de implementación | 18-11-2026**

## Preparación

Leer `docs/DEVELOPMENT.md` y `docs/AGENTS.md`. Entorno aislado sin datos reales. Usar versiones del repo y `pnpm install --frozen-lockfile`. Configurar `.env` local a partir de ejemplo, nunca publicar secretos. No ejecutar migraciones sobre producción. Capturar baseline de pruebas y vistas antes de cambios.

## Comandos existentes

```bash
pnpm check
pnpm db:test:up
pnpm test:integration
pnpm test:e2e
```

`check` incluye lint, boundaries, format:check, typecheck, Vitest y build. Integración requiere `TEST_DATABASE_URL` y PostgreSQL de prueba; E2E sigue setup documentado y Chromium de Playwright. No afirmar éxito sin salida real. No modificar tests para ocultar regresiones; actualizar selectores cuando cambia UX y preservar aserciones de negocio.

## Cobertura mínima

| Suite existente                                     | Regresión requerida                                           |
| --------------------------------------------------- | ------------------------------------------------------------- |
| `base.spec.ts`, `departments.spec.ts`               | navegación, CRUD y layout                                     |
| `identity-employees.spec.ts`, `super-admin.spec.ts` | sesión, alcance, cuentas protegidas                           |
| `attendance.spec.ts`                                | ENTRY/EXIT, GPS/home, motivos, rechazo, nocturno, reintentos  |
| `steps10-12.spec.ts`                                | turnos, borradores, publicación, ubicación, avisos/auditoría  |
| `requests.spec.ts`                                  | vacaciones, permisos, saldo y aprobación/retirada/cancelación |
| `dashboard.spec.ts`                                 | métricas, drilldown, visibilidad y diagnóstico                |

Añadir pruebas de UI al lado de cada feature; Testing Library por rol/nombre. Simular red lenta, timeout, 403, 409, respuesta HTTP 200 rechazada y sesión revocada. Probar separación de caches entre usuarios. Verificar selector de fecha inválida y rango máximo. No mockear todo el backend como sustituto de integración.

## Visual y accesibilidad

Capturas reproducibles Playwright con datos ficticios, viewport fijo, fuente cargada, fecha controlada y animaciones reducidas. Login, dashboard, móvil asistencia, calendario, aprobaciones, error/vacío en claro/oscuro. Revisar diffs, no aceptar snapshots automáticamente. Matriz responsive de 08, teclado/lector de pantalla de 09. Prueba física GPS aparte.

## Evidencia

Por fase: commit, comando, código salida, totales, captura, navegador/dispositivo, defectos pendientes. Si ambiente impide una prueba, registrar bloqueo y no marcarla aprobada. Los resultados de este documento son requisitos, no pruebas ejecutadas.

---

# Definition of Done y autorización de entrega

**MCR · Sistema de asistencia | Directrices de implementación | 18-11-2026**

## Checklist obligatorio por fase

- [ ] Cambios acotados a alcance aprobado, sin rutas o funcionalidades simuladas.
- [ ] Logo original, siete colores y Google Sans conforme a licencia/disponibilidad.
- [ ] Tokens semánticos, componentes reutilizados y sin CSS duplicado.
- [ ] Tema claro/oscuro, responsive, teclado, foco y contraste verificados.
- [ ] Loading, empty, error, forbidden, pending, éxito y red desconocida contemplados.
- [ ] Acciones reales con estados del servidor; no éxito ficticio en HTTP 200 rechazado.
- [ ] Home office sin GPS; presencial conserva geocerca y precisión.
- [ ] Idempotencia, CSRF, sesión, permisos y alcance preservados.
- [ ] Aprobaciones HEAD_ONLY/históricas correctas; sin autoaprobación.
- [ ] Turnos publicados, snapshots, marcajes y auditoría inmutables según contrato.
- [ ] `pnpm check`, integración y E2E aplicables con evidencia de salida.
- [ ] Capturas revisadas, mediciones y contraste documentados.
- [ ] No datos reales, secretos ni archivos fuente de tipografía no autorizados incluidos.
- [ ] Dependencias/lockfile intactos salvo cambio autorizado y justificado.

## Demostración de aceptación

1. Empleado inicia sesión y registra entrada presencial; repetir home office sin GPS; mostrar rechazo real y motivo cuando aplique.
2. Jefatura encuentra pendiente y decide con motivo; demostrar cuenta técnica sin autoridad de decisión.
3. ADMIN/HR crea borrador, mueve con alternativa de teclado, publica y prueba conflicto; no edita publicado.
4. Empleado solicita permiso por horas y ve restricciones; vacaciones separadas por períodos sin inventar saldo.
5. Directivo navega indicador hacia detalle permitido; cambiar sesión sin datos residuales.
6. Mostrar mismo flujo móvil/desktop, claro/oscuro, red lenta y efectos reducidos.

## Criterio de cierre

P0: seguridad, pérdida de datos, errores de marcaje/aprobación o bloqueo de flujo crítico → no entregar. P1: navegación inaccesible, contraste insuficiente, regresión significativa o estado incorrecto → corregir antes de liberar. P2: refinamientos no críticos → documentar y acordar seguimiento. No declarar WCAG certificado ni producción lista sin verificaciones operativas reales.

## Informe de entrega de Codex

Incluir resumen, archivos modificados, decisiones visuales, comportamiento preservado, pruebas y resultados reales, mediciones baseline/final, capturas, cambios de dependencias, limitaciones y riesgos. Identificar explícitamente toda propuesta no implementada. Solicitar autorización antes de ampliar alcance o tocar backend. La fase termina cuando se demuestra calidad, no cuando se generan pantallas.
