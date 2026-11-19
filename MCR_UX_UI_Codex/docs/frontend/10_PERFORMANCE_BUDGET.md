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
