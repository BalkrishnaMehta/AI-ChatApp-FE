export default interface Log {
  steps: Record<string, string>[];
  results: Record<string, string>[];
  error: { message: string; details: string; error: string } | null;
}
