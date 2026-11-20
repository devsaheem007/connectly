/** Strips Mongo operators ($…) and dotted keys from user input to block NoSQL injection. */
function clean(obj) {
  if (Array.isArray(obj)) return obj.forEach(clean)
  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$') || key.includes('.')) delete obj[key]
      else clean(obj[key])
    }
  }
}
export function sanitizeInput(req, res, next) {
  clean(req.body)
  clean(req.query)
  clean(req.params)
  next()
}
