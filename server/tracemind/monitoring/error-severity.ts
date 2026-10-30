/**
 * Shared error classification for log sources that carry no explicit level
 * (CloudWatch messages, database log rows). A message counts as an error
 * only when it carries an unambiguous failure marker. A bare "failed" is
 * deliberately NOT enough: business outcomes ("payment failed", "login
 * failed") are not incidents, and the detector already requires three
 * matching errors in five minutes before anything is created. Application
 * loggers that emit an ERROR level produce these markers naturally.
 */
export function severityOfMessage(
  message: string,
): "ERROR" | "WARNING" | "INFO" {
  if (
    /\b(error|err|fatal|critical|exception|traceback|unhandled)\b/i.test(
      message,
    ) ||
    /timed?\s*out/i.test(message) ||
    /out of memory/i.test(message)
  ) {
    return "ERROR";
  }
  if (/\b(warn|warning)\b/i.test(message)) return "WARNING";
  return "INFO";
}
