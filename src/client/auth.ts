export function basicAuthHeader(username: string, password: string): string {
  const encoded = Buffer.from(`${username}:${password}`).toString("base64");
  return `Basic ${encoded}`;
}
