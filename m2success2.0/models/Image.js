const mongoose = require("mongoose")

var schema = new mongoose.Schema({
    name: String,
    img:
    {
        data: Buffer,
        contentType: String
    }
});

module.exports = mongoose.model("Image", schema)