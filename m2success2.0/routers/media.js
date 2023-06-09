const express = require("express")
const User = require("../models/User")
const Doc = require("../models/Doc")
const Image = require("../models/Image")
const multer = require("multer");
const path = require('path');
const fs = require("fs");
const media_router = express.Router()

var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads')
  },
  filename: (req, file, cb) => {
    console.log(file);
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
  }
});
var imageFilter = (req, file, cb) => {
  switch (file.mimetype) {
    case 'image/jpeg':
    case 'image/png':
    case 'image/gif':
      cb(null, true)
      break;
    default:
      cb(null, false)
      break;
  }
}
var upload = multer({ storage: storage, fileFilter: imageFilter });

media_router.post("/media/upload", upload.single('file'), (req, res, next) => {
  console.log("upload: ", req.file);
  if (req.session.user) {
    console.log("upload: ", req.body);
    res.set("X-CSE356", "61fa44e173ba724f297dbbb9");

    if (req.file)
      res.json({ mediaid: req.file.filename })
    else
      res.json({ error: true, message: "not image" });
  } else {
    res.json({ error: true, message: "not login yet" });
  }

});
media_router.get("/media/access/:MEDIAID", async (req, res) => {
  console.log("media/access---- ");
  if (req.session.user) {
    console.log("media/access/:MEDIAID: ", req.params.MEDIAID);
    res.set("X-CSE356", "61fa44e173ba724f297dbbb9");
    // var imgGet = await db.collection("images").findOne({name:req.params.MEDIAID})
    // console.log(path.join(__dirname, "uploads", req.params.MEDIAID))
    console.log("/root/uploads/" + req.params.MEDIAID)

    res.sendFile("/root/uploads/" + req.params.MEDIAID)
  } else {
    res.json({ error: true, message: "not login yet" });
  }

});

module.exports = media_router