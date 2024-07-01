import multer from "multer"

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
        const fileNameSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9)
        //cb(null, file.fieldname + "-" + fileNameSuffix)
        //orignalname gives the name of file as it is on users name
        cb(null, file.originalname)
    }
})

export const upload = multer({ 
    storage 
})