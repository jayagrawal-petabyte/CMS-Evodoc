/**
 * Sanitize a free-text value before interpolating it into a PostgREST filter
 * string (e.g. `.or('col.ilike.%VALUE%')`). PostgREST treats characters like
 * `,` `(` `)` `*` `.` as filter syntax, so an unsanitized value can inject extra
 * conditions or break the query. We keep only characters that are meaningful for
 * a name/phone search and strip everything else.
 */
export function sanitizeSearch(input: unknown, maxLen = 60): string {
  if (typeof input !== 'string') return ''
  return input
    .slice(0, maxLen)
    .replace(/[^a-zA-Z0-9 @._+-]/g, '') // allow letters, digits, space, and safe phone/email chars
    .replace(/[%_]/g, '')               // strip SQL LIKE wildcards the user might inject
    .trim()
}
