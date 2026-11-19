/** Stable, local comparison of form values; private file contents never leave the form. */
export function requestDraftSnapshot(container: HTMLElement, initial = false) {
  return JSON.stringify(
    Array.from(container.querySelectorAll('form')).map((form) => {
      const data = new FormData(form);
      if (initial)
        for (const control of form.querySelectorAll<
          HTMLInputElement | HTMLSelectElement
        >('[data-draft-initial-value]'))
          if (control.name && control.dataset.draftInitialValue !== undefined)
            data.set(control.name, control.dataset.draftInitialValue);
      return Array.from(data.entries()).map(([name, value]) => [
        name,
        typeof value === 'string'
          ? value
          : value.name
            ? [value.name, value.size, value.type, value.lastModified]
            : null,
      ]);
    }),
  );
}
