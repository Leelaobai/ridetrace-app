export function getErrorMessage(error: unknown, fallback = '操作失败，请重试'): string {
  const data = (error as any)?.response?.data;
  if (typeof data?.message === 'string' && data.message.length > 0) {
    return data.message;
  }
  return fallback;
}

export function getErrorCode(error: unknown): string | null {
  return (error as any)?.response?.data?.code ?? null;
}
