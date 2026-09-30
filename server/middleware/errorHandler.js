// Central error handler. Any `next(err)` call in a controller ends up here.
export default function errorHandler(err, req, res, next) {
  console.error(err.stack);
  const status = err.statusCode || 500;
  res.status(status).json({
    message: err.message || "Something went wrong on our end.",
  });
}
