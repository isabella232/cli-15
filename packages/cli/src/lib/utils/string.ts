export function camelToSnakeCase(str: string) {
  return str
    .replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
    .replace(/^_+/, '');
}
