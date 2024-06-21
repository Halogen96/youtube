//we use this class for consistent error handling for API related task

class apiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        erros = [],
        stack = ""
    ) {
        super(message)
        this.message = message
        this.statusCode = statusCode
        this.data = null
        this.success = false
        this.errors = errors
    }
}

export {apiError}