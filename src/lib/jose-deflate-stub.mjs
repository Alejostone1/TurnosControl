// Stub for jose JWE "zip" compression – next-auth uses signed JWTs (JWS),
// not encrypted JWTs (JWE), so these paths are never called at runtime.
export async function compress() {
  throw new Error('JWE "zip" compression is not supported in Edge Runtime')
}
export async function decompress() {
  throw new Error('JWE "zip" decompression is not supported in Edge Runtime')
}
