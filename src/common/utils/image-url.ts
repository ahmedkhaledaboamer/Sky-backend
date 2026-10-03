// Turns a stored file name into a public URL: `${BASE_URL}/<folder>/<file>`.
// Values that are already URLs are returned untouched, so a document that is
// read and saved again never ends up with a nested URL.
export const toImageUrl = (folder: string, value?: string | null) => {
  if (!value || /^https?:\/\//.test(value)) return value;
  // BASE_URL may be set with a trailing slash ("https://site.com/"): avoid "//folder"
  const base = (process.env.BASE_URL ?? '').replace(/\/+$/, '');
  return `${base}/${folder}/${value}`;
};

// Reverse of toImageUrl — keeps only the file name before saving.
export const toFileName = (value?: string | null) => {
  if (!value || !/^https?:\/\//.test(value)) return value;
  return value.slice(value.lastIndexOf('/') + 1);
};
