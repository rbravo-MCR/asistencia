import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { requestVoid } from '@/lib/api';
export function useWrite(
  csrfToken: string,
  keys: string[],
  onSuccess?: () => void,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      path,
      body,
      method = 'POST',
    }: {
      path: string;
      body?: unknown;
      method?: string;
    }) => requestVoid(path, { method, body, csrfToken }),
    onSuccess: async () => {
      await Promise.all(
        keys.map((key) => client.invalidateQueries({ queryKey: [key] })),
      );
      onSuccess?.();
    },
    retry: false,
  });
}
export function submit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  return new FormData(event.currentTarget);
}
