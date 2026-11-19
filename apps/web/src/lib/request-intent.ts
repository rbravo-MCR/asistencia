export type RequestKindIntent = 'VACATION' | 'PERMISSION' | 'JUSTIFICATION';
export type RequestIntentSearch = {
  create?: RequestKindIntent;
  period?: number;
};

/** Navigation hints only: authorization and vacation days always come from the API. */
export function requestIntentSearch(
  input: Record<string, unknown>,
): RequestIntentSearch {
  const create = input.create;
  if (
    create !== 'VACATION' &&
    create !== 'PERMISSION' &&
    create !== 'JUSTIFICATION'
  )
    return {};
  const period = Number(input.period);
  return {
    create,
    ...(create === 'VACATION' &&
    Number.isInteger(period) &&
    period >= 1 &&
    period <= 100
      ? { period }
      : {}),
  };
}
