const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Short, readable, prefixed ids. Readability matters here because ids are
 * handed to agents through WebMCP tool results and typed back in arguments.
 */
export function id(prefix: string): string {
  let out = "";
  for (let i = 0; i < 8; i += 1) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `${prefix}_${out}`;
}

export function now(): string {
  return new Date().toISOString();
}
