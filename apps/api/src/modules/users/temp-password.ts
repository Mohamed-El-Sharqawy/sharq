// FR-AUTH-04/05 — the server mints the temporary password (the admin shares
// it out-of-band; must_change_password forces a swap on next login). 12
// chars over an unambiguous 58-symbol alphabet (~70 bits): no 0/O/1/l/I,
// which are indistinguishable when read aloud or handwritten. Fixed in code
// with this citation — §5.2 defines no password-material settings.
const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LENGTH = 12;

export function generateTempPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(LENGTH));
  let password = "";
  for (const byte of bytes) password += ALPHABET[byte % ALPHABET.length];
  return password;
}
