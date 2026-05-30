// @ts-check
const DOMPurify = require('isomorphic-dompurify');

const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'strong', 'b', 'em', 'i', 'u', 's',
  'ul', 'ol', 'li',
  'pre', 'code',
  'blockquote',
  'a',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'div', 'span',
];

const ALLOWED_ATTR = ['href', 'title', 'target', 'rel', 'class'];

function sanitizeHtml(html) {
  if (typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'style'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'style'],
  });
}

module.exports = { sanitizeHtml };
