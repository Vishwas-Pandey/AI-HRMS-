const notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Not found - ${req.originalUrl}`));
};

const errorHandler = (err, req, res, next) => {
  let status = res.statusCode >= 400 ? res.statusCode : 500;
  let message = err.message;

  // Turn Mongoose/Mongo errors into readable 400s instead of 500s.
  if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(", ");
  } else if (err.name === "CastError") {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (err.code === 11000) {
    status = 400;
    message = `Duplicate value for ${Object.keys(err.keyValue || {}).join(", ") || "a unique field"}`;
  } else if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Malformed JSON body";
  } else if (err.code === "LIMIT_FILE_SIZE") {
    status = 400;
    message = "File is too large (max 5 MB)";
  }

  if (status >= 500) console.error(err);
  res.status(status).json({
    message: status >= 500 && process.env.NODE_ENV === "production" ? "Something went wrong" : message,
  });
};

module.exports = { notFound, errorHandler };
