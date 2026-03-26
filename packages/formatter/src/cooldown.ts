/**
 * Tracks cooldown state for reminder deduplication.
 * Prevents repeated reminders for the same key within a cooldown window.
 */
export class ReminderCooldown {
  private readonly cooldownMs: number;
  private readonly lastSeen = new Map<string, number>();

  constructor(cooldownMs = 20_000) {
    this.cooldownMs = cooldownMs;
  }

  /**
   * Check whether a reminder should fire for the given key.
   * Returns true if the cooldown has elapsed (or this is the first time).
   * Automatically records the current timestamp when returning true.
   */
  shouldRemind(key: string): boolean {
    const now = Date.now();
    const last = this.lastSeen.get(key) ?? 0;
    if (now - last < this.cooldownMs) {
      return false;
    }
    this.lastSeen.set(key, now);
    return true;
  }

  /** Build a standard cooldown key for a file read operation. */
  static readKey(absolutePath: string, offset: number, limit: number | undefined): string {
    const limitKey = limit === undefined ? "all" : String(limit);
    return `${absolutePath}:${String(offset)}:${limitKey}`;
  }
}
