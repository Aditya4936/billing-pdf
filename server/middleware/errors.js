/** An error whose message is safe to show the user. */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function notFound(req, res) {
  res.status(404).json({ error: 'Not found.' });
}

// Express recognises an error handler by its four parameters.
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }
  if (error.name === 'ValidationError') {
    // Mongoose: every message here was written in the schemas for the user to read.
    const message = Object.values(error.errors ?? {})
      .map((e) => e.message)
      .join(' ');
    return res.status(400).json({ error: message || 'Some details are not valid.' });
  }
  if (error.name === 'CastError') {
    return res.status(400).json({ error: 'That request was not valid.' });
  }
  if (error.code === 11000) {
    return res.status(409).json({ error: 'That already exists.' });
  }
  // Body-parser failures (bad JSON, body too large) carry their own status.
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'The request body is not valid JSON.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'The request is too large.' });
  }

  console.error(error);
  return res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
}
