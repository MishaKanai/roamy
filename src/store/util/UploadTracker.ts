export class UploadTracker {
  private itemTimestamps: Map<string, number>;

  constructor() {
    this.itemTimestamps = new Map();
  }

  // Adds or updates the timestamp for a given item key
  markForUpload(key: string): void {
    this.itemTimestamps.set(key, Date.now());
  }

  // Creates a snapshot of the current map, which is immutable and safe to use for uploads
  createSnapshot(): Map<string, number> {
    return new Map(this.itemTimestamps);
  }

  // Clears all items from the tracker, resetting it to an empty state
  clear(): void {
    this.itemTimestamps.clear();
  }

  // Clears items that are at or before the provided timestamps in the snapshot
  // Clears items that are at or before the provided timestamps in the snapshot
  clearUploaded(snapshot: Map<string, number>): void {
    for (const [key, timestamp] of snapshot) {
      // Get the current timestamp for the key in the main map
      const storedTimestamp = this.itemTimestamps.get(key);

      // Only delete if the stored timestamp is <= the snapshot timestamp
      if (storedTimestamp !== undefined && storedTimestamp <= timestamp) {
        this.itemTimestamps.delete(key);
      }
    }
  }
  isPending(key: string): boolean {
    return this.itemTimestamps.has(key);
  }
  getAllPendingKeys(): string[] {
    return Array.from(this.itemTimestamps.keys());
  }
}
