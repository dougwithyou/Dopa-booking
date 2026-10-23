/** Cookie holding an anonymous random visitor id (no personal data) used to
 * count unique visitors in the admin stats. Set by middleware. */
export const VISITOR_COOKIE = 'dopa_vid';
export const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
