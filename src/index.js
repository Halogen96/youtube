import dotenv from 'dotenv'
import connectDB from "./db/database.js"
import app from './app.js'

const port = process.env.PORT || 8000;

dotenv.config({
    path: './.env'
})

connectDB()
.then(() => {
    app.listen(port, () => {
        console.log(`SERVER RUNNING at port ${port}`)
    })
})
.catch((err) => {
    console.log("MONGODB CONENCTION FAILED !!! ", err)
})