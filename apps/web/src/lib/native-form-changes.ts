/** Compare uncontrolled native fields with their initial DOM values. */
type NativeControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
export function hasNativeFormChanges(root: ParentNode) {
  return Array.from(
    root.querySelectorAll<NativeControl>(
      'input[name], select[name], textarea[name]',
    ),
  ).some((control) => {
    if (
      control instanceof HTMLInputElement &&
      (control.type === 'checkbox' || control.type === 'radio')
    ) {
      return control.checked !== control.defaultChecked;
    }
    if (control instanceof HTMLSelectElement) {
      const options = Array.from(control.options);
      const defaults = options.filter((option) => option.defaultSelected);
      const initial = defaults.length
        ? defaults
        : control.multiple
          ? []
          : options.slice(0, 1);
      return (
        JSON.stringify(
          Array.from(control.selectedOptions, (option) => option.value),
        ) !== JSON.stringify(initial.map((option) => option.value))
      );
    }
    return control.value !== control.defaultValue;
  });
}
