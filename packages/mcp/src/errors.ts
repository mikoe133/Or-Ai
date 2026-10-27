export class AdapterError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable = false,
  ) {
    super(message);
  }
}

export function safeError(error: unknown) {
  if (error instanceof AdapterError)
    return { code: error.code, message: error.message, retryable: error.retryable };
  return {
    code: "ADAPTER_ERROR",
    message: "The operation could not be completed. Check the local API and configuration.",
    retryable: false,
  };
}
