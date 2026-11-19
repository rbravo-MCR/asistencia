## POLÍTICA OBLIGATORIA DE VERSIONES TECNOLÓGICAS

El proyecto utilizará las versiones estables más recientes de todas sus tecnologías.

### Versiones iniciales verificadas

- React: 19.3.1

- Fastify: 5.12.8

- TypeScript: última versión estable compatible.

- Node.js: última versión LTS activa compatible.

- Vite: última versión estable compatible.

- Tailwind CSS: última versión estable compatible.

- shadcn/ui: versión estable compatible con React y Tailwind.

- Drizzle ORM: última versión estable compatible.

- PostgreSQL: versión estable con soporte vigente.

### Reglas obligatorias

1. Antes de instalar cualquier dependencia, consultar el registro npm y verificar la versión estable disponible.

2. No instalar versiones alpha, beta, RC, canary, nightly ni experimental.

3. No utilizar versiones antiguas solamente porque aparecen en ejemplos de documentación.

4. Verificar compatibilidad entre React, Vite, shadcn/ui, Tailwind CSS y sus dependencias.

5. Verificar compatibilidad de plugins oficiales de Fastify con la versión mayor seleccionada.

6. Priorizar actualizaciones de seguridad.

7. Registrar versiones exactas y conservar `pnpm-lock.yaml` en Git.

8. No actualizar automáticamente dependencias mayores sin pruebas de regresión.

9. Ejecutar lint, typecheck, tests y build después de instalar o actualizar dependencias.

10. Si una versión reciente presenta incompatibilidades, usar la última versión estable compatible y documentar la decisión.

### Restricción importante

Fastify 6 no debe utilizarse mientras siga en fase alpha, beta o RC.

La selección debe basarse en estabilidad, compatibilidad y seguridad, no solamente en el número de versión más alto.

No modificar las demás decisiones arquitectónicas del proyecto.


