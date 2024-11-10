// src/utils/UploadTracker.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { UploadTracker } from "./UploadTracker";

describe("UploadTracker", () => {
  let tracker: UploadTracker;

  beforeEach(() => {
    tracker = new UploadTracker();
  });

  it("should add and update timestamps for keys", () => {
    tracker.markForUpload("doc1");
    const firstTimestamp = tracker.createSnapshot().get("doc1")!;
    
    // Wait a moment and update the timestamp
    setTimeout(() => {
      tracker.markForUpload("doc1");
      const updatedTimestamp = tracker.createSnapshot().get("doc1")!;
      expect(updatedTimestamp).toBeGreaterThan(firstTimestamp);
    }, 10);
  });

  it("should create an immutable snapshot of current keys and timestamps", () => {
    tracker.markForUpload("doc1");
    tracker.markForUpload("doc2");

    const snapshot = tracker.createSnapshot();

    // Check that snapshot has the expected keys and timestamps
    expect(snapshot.has("doc1")).toBe(true);
    expect(snapshot.has("doc2")).toBe(true);

    // Modify the tracker and check that snapshot remains unaffected
    tracker.markForUpload("doc3");
    expect(snapshot.has("doc3")).toBe(false);
  });

  it("should only clear items up to the snapshot timestamp", () => {
    tracker.markForUpload("doc1");
    tracker.markForUpload("doc2");
    
    const snapshot = tracker.createSnapshot();

    // Mark an additional item after the snapshot was taken
    tracker.markForUpload("doc3");

    // Clear items based on the snapshot
    tracker.clearUploaded(snapshot);

    // Items in snapshot should be cleared
    expect(tracker.isPending("doc1")).toBe(false);
    expect(tracker.isPending("doc2")).toBe(false);

    // Item added after snapshot should remain
    expect(tracker.isPending("doc3")).toBe(true);
  });

  it("should not clear items with newer timestamps than the snapshot", async () => {
    tracker.markForUpload("doc1");
    
    // Take snapshot
    const snapshot = tracker.createSnapshot();
    
    // Wait to ensure Date.now() changes
    await new Promise((resolve) => setTimeout(resolve, 1));
  
    // Update the timestamp for doc1 after taking the snapshot
    tracker.markForUpload("doc1");
  
    // Attempt to clear based on the snapshot
    tracker.clearUploaded(snapshot);
  
    // doc1 should not be cleared since it has a newer timestamp than in the snapshot
    expect(tracker.isPending("doc1")).toBe(true);
  });
  

  it("should return all pending keys", () => {
    tracker.markForUpload("doc1");
    tracker.markForUpload("doc2");

    expect(tracker.getAllPendingKeys()).toContain("doc1");
    expect(tracker.getAllPendingKeys()).toContain("doc2");
  });

  it("should correctly check if an item is pending upload", () => {
    tracker.markForUpload("doc1");

    expect(tracker.isPending("doc1")).toBe(true);
    expect(tracker.isPending("doc2")).toBe(false);
  });
});
