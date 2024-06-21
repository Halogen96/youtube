//defining the structure of response from API 

class apiResponse {
    constructor(statusCode, data, message = "Success") {
        this.statusCode = statusCode
        this.data = data
        this.message = message
        this.success = statusCode < 400
        
        //status code for each application is defined by the choice of the code
        //here we are defining that the code of the response has to be below 400
        //read more abouut HTTP status codes: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
    }
}

export { apiResponse }