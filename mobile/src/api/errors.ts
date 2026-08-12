import { AxiosError } from 'axios';

export function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'isAxiosError' in err) {
    const axiosErr = err as AxiosError<Record<string, unknown>>;
    const data = axiosErr.response?.data;
    if (data) {
      if (typeof data === 'string') return data;
      if (typeof data.detail === 'string') return data.detail;

      // DRF validation errors look like { field: ["msg1", "msg2"], ... }
      const messages = Object.entries(data).flatMap(([field, value]) => {
        const msgs = Array.isArray(value) ? value : [String(value)];
        return msgs.map((m) => (field === 'non_field_errors' ? String(m) : `${field}: ${m}`));
      });
      if (messages.length) return messages.join('\n');
    }
    if (axiosErr.message) return axiosErr.message;
  }
  return 'Something went wrong. Please try again.';
}
