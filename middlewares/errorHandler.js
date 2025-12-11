export function notFound(req, res, next) {
  res.status(404).json({ message: 'Not Found' })
}

export function errorHandler(err, req, res, next) {
  if (err && err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ message: 'Invalid CSRF token' })
  }
  const status = err.status || 500
  res.status(status).json({ message: err.message || 'Internal Server Error' })
}
