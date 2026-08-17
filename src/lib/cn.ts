import { clsx, type ClassValue } from 'clsx';

/** Tiny classnames helper — kept local so we don't need extra deps beyond `clsx`. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
