// Public entry point of src/import: pure readers of bank statement files.
export { readStatement } from './registry';
export { looksLikeOfx } from './ofx';
export {
  MAX_STATEMENT_CHARS,
  READ_ERRORS,
  REJECTION_REASONS,
  type ParsedLine,
  type ParsedStatement,
  type ReadError,
  type ReadErrorCode,
  type RejectedLine,
  type RejectionReason,
} from './statement';
