import type { ReactNode } from 'react';
import { CheckCircle2, Info, TriangleAlert } from 'lucide-react';
const tones = {
  info: 'border-info/25 bg-info/5 text-info',
  success: 'border-success/25 bg-success/5 text-success',
  warning: 'border-warning/25 bg-warning/5 text-warning',
  danger: 'border-destructive/25 bg-destructive/5 text-destructive',
};
export function InlineNotice({
  tone = 'info',
  children,
  role,
}: {
  tone?: keyof typeof tones;
  children: ReactNode;
  role?: 'alert' | 'status';
}) {
  const Icon =
    tone === 'success'
      ? CheckCircle2
      : tone === 'warning' || tone === 'danger'
        ? TriangleAlert
        : Info;
  return (
    <div
      role={role ?? (tone === 'danger' ? 'alert' : 'status')}
      className={`flex min-w-0 items-start gap-3 rounded-xl border p-4 text-sm leading-6 ${tones[tone]}`}
    >
      <Icon className="mt-1 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}
