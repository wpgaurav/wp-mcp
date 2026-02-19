export class ToolRegistry {
  private readonly registered = new Set<string>();

  has(name: string): boolean {
    return this.registered.has(name);
  }

  register(name: string): void {
    this.registered.add(name);
  }

  all(): string[] {
    return [...this.registered];
  }
}
