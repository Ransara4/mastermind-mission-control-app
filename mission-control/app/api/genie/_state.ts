export interface RuntimeHandle {
  exitCode: number | null;
  kill: (signal?: string) => void;
}

// Shared state for the two concurrent terminal slots.
// Module-level singletons persist across requests within the same server process.
export const processes = new Map<"A" | "B", RuntimeHandle>();
