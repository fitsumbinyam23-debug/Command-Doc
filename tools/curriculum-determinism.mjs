export function normalizeForDeterministicCompare(value) {
  return String(value ?? "").replace(/\r\n/g, "\n");
}

export function deterministicEqual(left, right) {
  return normalizeForDeterministicCompare(left) === normalizeForDeterministicCompare(right);
}
