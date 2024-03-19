class ApiError extends Error {
  constructor(
    statuscode,
    message = "Somethin went wrong",
    errors = [],
    stack = ""
  ) {
    super(message);
    this.statuscode = statuscode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;
    if (stack) {
      this.stack = stack;
    }
  }
}

export { ApiError };
