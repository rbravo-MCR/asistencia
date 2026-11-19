import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
function violations(files: Record<string, string>) {
  const fixture = mkdtempSync(join(tmpdir(), 'asistencia-boundaries-'));
  try {
    for (const [name, source] of Object.entries(files)) {
      const path = join(fixture, 'apps/api/src', name);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, source);
    }
    const result = spawnSync(
      process.execPath,
      [
        resolve(
          root,
          'node_modules/dependency-cruiser/bin/dependency-cruiser.mjs',
        ),
        '--config',
        resolve(root, '.dependency-cruiser.cjs'),
        '--ts-config',
        resolve(root, 'apps/api/tsconfig.json'),
        '--output-type',
        'json',
        'apps/api/src',
      ],
      { cwd: fixture, encoding: 'utf8' },
    );
    if (!result.stdout.trim())
      throw new Error(result.stderr || 'Sin resultado de análisis');
    const output = JSON.parse(result.stdout) as {
      summary: { violations: { rule: { name: string } }[] };
    };
    return output.summary.violations.map((violation) => violation.rule.name);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

describe('límites modulares', () => {
  it('permite importar el contrato público de otro módulo', () => {
    expect(
      violations({
        'modules/a/service.ts':
          "import { value } from '../b/index.js'; export { value };",
        'modules/b/index.ts': 'export const value = 1;',
      }),
    ).toEqual([]);
  });
  it('rechaza importar un repositorio privado de otro módulo', () => {
    expect(
      violations({
        'modules/a/service.ts':
          "import { value } from '../b/repository.js'; export { value };",
        'modules/b/repository.ts': 'export const value = 1;',
      }),
    ).toContain('module-public-api-only');
  });
  it('permite acceder a los detalles internos del mismo módulo', () => {
    expect(
      violations({
        'modules/a/service.ts':
          "import { value } from './repository.js'; export { value };",
        'modules/a/repository.ts': 'export const value = 1;',
      }),
    ).toEqual([]);
  });
  it('rechaza dependencias de infraestructura desde dominio', () => {
    expect(
      violations({
        'modules/a/domain/entity.ts':
          "import { value } from '../../../infrastructure/database.js'; export { value };",
        'infrastructure/database.ts': 'export const value = 1;',
      }),
    ).toContain('domain-is-independent');
  });
  it('rechaza ciclos aunque ocurran dentro de un módulo', () => {
    expect(
      violations({
        'modules/a/one.ts': "import './two.js';",
        'modules/a/two.ts': "import './one.js';",
      }),
    ).toContain('no-circular');
  });
});

it('permite usar un schema público desde un adaptador de persistencia', () => {
  expect(
    violations({
      'modules/a/infrastructure/repository.ts':
        "import { value } from '../../b/schema.js'; export { value };",
      'modules/b/schema.ts': 'export const value = 1;',
    }),
  ).toEqual([]);
});
it('impide que el dominio use incluso un schema público de persistencia', () => {
  expect(
    violations({
      'modules/a/domain/entity.ts':
        "import { value } from '../../b/schema.js'; export { value };",
      'modules/b/schema.ts': 'export const value = 1;',
    }),
  ).toContain('domain-is-independent');
});
