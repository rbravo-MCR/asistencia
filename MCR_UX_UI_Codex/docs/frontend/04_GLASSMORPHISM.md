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
