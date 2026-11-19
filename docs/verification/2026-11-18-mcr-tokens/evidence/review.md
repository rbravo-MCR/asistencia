# Revisión independiente del punto 3

Revisor independiente de lectura: review_tokens (gpt-6.2-astra), usando plan/spec y snapshot de fuentes del baseline. Veredicto inicial: listo con correcciones. Sin cambios de archivos por parte del revisor.

## Hallazgos atendidos

1. Importante: bordes de campos nativos heredaban `--border`, decorativo e insuficiente para límite funcional. Se aplica `--input` en base a input/select/textarea, manteniendo utilidades de error/foco con mayor prioridad. Regresión RED real de calendario (ratio <3) y posterior suite de apariencia.
2. Importante: selección de día y foco/navegación en forced colors no eran independientes. Se conservan con borde doble de selección, subrayado de enlace activo y anillo exterior de foco. La regresión inicial mostró borderStyle solid en vez de double; la prueba usa interacción real de teclado para verificar foco visible.
3. Menor, corregido: títulos con `sm:text-4xl/5xl` residuales crecían antes de reducirse en md. Eliminadas esas variantes; escala móvil 24 / desktop 30 px. Revisión visual de capturas.
4. Menor, corregido: la prueba repetía esquema claro sin producir transición del sistema. Se cambia oscuro→claro mientras se mantiene elección explícita.

## Observaciones fuera de alcance

El rediseño estructural del menú corresponde al punto 5 y no bloquea esta base de tokens. Las capturas/mediciones y ejecución de suites son evidencia del implementador, no una afirmación del revisor. El espécimen local no se publica en producción. No se hizo segunda revisión independiente; se verifican los cambios con regresiones y suites completas.

## Decisión posterior de entrega

Se consultó al revisor sobre una alternativa inline con hash CSP; advirtió que requería coordinar el hash con el despliegue. Se descartó esa alternativa. La versión final usa archivo local externo `defer` antes de la entrada de módulo, mantiene la configuración Vite original y no cambia cabeceras. La prueba del implementador sobre `dist` demuestra compatibilidad con `script-src self`, orden de arranque con retardo y bloqueo de inline ajeno. La partición final de rutas y este archivo diferido cuentan con suites del implementador; no se atribuye al revisor aprobación de bytes que no inspeccionó.
