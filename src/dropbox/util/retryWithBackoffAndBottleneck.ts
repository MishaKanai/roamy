import Bottleneck from "bottleneck";
import { DropboxResponseError } from "dropbox";

const limiter = new Bottleneck({
  maxConcurrent: 5, // Limit to 4 concurrent requests
});

// Retry function with exponential backoff, incorporating limiter
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries = 5,
  baseDelay = 1000
): Promise<T> {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      // Schedule the operation with the limiter
      return await limiter.schedule(operation);
    } catch (error) {
      if ((error as DropboxResponseError<any>).status === 409) {
        throw error;
      }
      attempt++;
      if (attempt >= maxRetries) {
        throw new Error(
          `Operation failed after ${maxRetries} attempts: ${error}`
        );
      }

      // Exponential backoff delay
      const delay = baseDelay * 2 ** (attempt - 1);
      console.log(`Attempt ${attempt} failed. Retrying in ${delay} ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Failed to complete operation within retry limits.");
}
