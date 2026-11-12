/**
 * What a phone field after a fixed "+256" can hold: the 9 digits of a Ugandan
 * mobile number and nothing more. A pasted or habitual prefix is dropped
 * rather than counted — "0708 987 654" and "256708987654" both become
 * "708987654".
 */
export const UG_LOCAL_DIGITS = 9;

export function ugLocalDigits(input: string): string {
  let d = input.replace(/\D/g, '');
  if (d.length > UG_LOCAL_DIGITS && d.startsWith('256')) d = d.slice(3);
  if (d.startsWith('0')) d = d.slice(1);
  return d.slice(0, UG_LOCAL_DIGITS);
}
