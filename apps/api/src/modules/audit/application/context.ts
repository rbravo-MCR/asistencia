import { AsyncLocalStorage } from 'node:async_hooks';
export interface AuditContext {
  requestId: string;
  actorId: string | null;
}
const storage = new AsyncLocalStorage<AuditContext>();
export function withAuditContext<T>(
  context: AuditContext,
  callback: () => T,
): T {
  return storage.run(context, callback);
}
export function setAuditActor(actorId: string) {
  const context = storage.getStore();
  if (context) context.actorId = actorId;
}
export function getAuditContext() {
  return storage.getStore();
}
