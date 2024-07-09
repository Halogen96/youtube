//This function is a higher-order function that takes an asynchronous request handler (requestHandler) as an argument and returns a new function that wraps the original request handler. 
//The new function ensures that any errors occurring in the requestHandler are caught and passed to the next middleware in the Express.js error-handling chain.

//using try catch block
const asyncHandler = (fn) => {
    return async (req, res, next) => {
        try {
            await fn(req, res, next)
        } catch (error) {
            res.status(error.code || 500).json({
                message: error.message,
                succes: false
            })
        }
    }
}

//using promises
// const asyncHandler2 = (requestHandler) => {
//     async (req, res, next) => {
//         Promise.resolve(await requestHandler(req, res, next)).catch((err) => next(err))
//     }
// }

export {asyncHandler}