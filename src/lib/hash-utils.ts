import { createHash } from 'crypto';

/**
 * Generates a URL-friendly SHA256 hash for a given string.
 * The hash is deterministic, meaning the same input will always produce the same output.
 * It uses SHA256 for strong collision resistance and base64url encoding for URL safety.
 *
 * @param input The string to hash.
 * @returns A URL-friendly base64 encoded SHA256 hash.
 *          Returns an empty string if the input is null, undefined, or empty.
 */
export function generateDeterministicIdHash(input: string | null | undefined): string {
  if (!input) {
    // Return empty or throw error, based on how you want to handle empty inputs.
    // For now, returning empty string for simplicity in case of unexpected null/undefined.
    return '';
  }
  const hash = createHash('sha256').update(input).digest('base64');
  // Make it URL-friendly: replace '+' with '-', '/' with '_', and remove '=' padding
  return hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
