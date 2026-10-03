import slugify from 'slugify';

// Same as the `setSlug` custom validators: slugify(name, { lower: true })
export const toSlug = (value: unknown) => slugify(String(value), { lower: true });
