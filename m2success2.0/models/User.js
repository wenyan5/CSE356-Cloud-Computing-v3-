const mongoose = require("mongoose")

var schema  = mongoose.Schema({
    name: String,
    email: String,
    password: String,
    verify: false
  });

module.exports = mongoose.model("User", schema)