module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'domain-is-independent',
      severity: 'error',
      from: { path: '^apps/api/src/modules/[^/]+/domain/' },
      to: {
        path: '(node_modules/(fastify|@fastify|drizzle-orm|pg)(/|$)|apps/api/src/(bootstrap|infrastructure)/|apps/api/src/modules/[^/]+/(infrastructure|http)/|apps/api/src/modules/[^/]+/schema\\.ts$)',
      },
    },
    {
      name: 'module-public-api-only',
      severity: 'error',
      from: { path: '^apps/api/src/modules/([^/]+)/' },
      to: {
        path: '^apps/api/src/modules/(?!$1/)[^/]+/(?!index\\.ts$|schema\\.ts$)',
      },
    },
    {
      name: 'contracts-no-infrastructure',
      severity: 'error',
      from: { path: '^packages/contracts/src/' },
      to: { path: '^apps/|node_modules/(fastify|drizzle-orm|pg)/' },
    },
    {
      name: 'web-no-backend-internals',
      severity: 'error',
      from: { path: '^apps/web/src/' },
      to: { path: '^apps/api/' },
    },
  ],
  options: {
    tsConfig: { fileName: 'apps/api/tsconfig.json' },
    tsPreCompilationDeps: true,
    doNotFollow: { path: 'node_modules' },
  },
};
