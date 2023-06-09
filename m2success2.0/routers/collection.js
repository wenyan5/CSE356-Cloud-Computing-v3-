const express = require("express")
const User = require("../models/User")
const Doc = require("../models/Doc")
const Image = require("../models/Image")
const collection_router = express.Router()
var session = require('express-session')
var richText = require('rich-text');
const mongoose = require("mongoose")
var ShareDB = require('sharedb');
ShareDB.types.register(richText.type);
const ShareDbMongo = require('sharedb-mongo');

var backend = new ShareDB({
  presence: true,
  doNotForwardSendPresenceErrorsToClient: true,
  db: new ShareDbMongo("mongodb://localhost:27017/cse356")
});
var connection = backend.connect();

var cse356docs = mongoose.model('cse356', new mongoose.Schema({}))

collection_router.post("/collection/create", async (req, res) => {
  if (req.session.user) {
    res.set("X-CSE356", "61fa44e173ba724f297dbbb9");
    console.log("collection/create: ", req.body);
    var docC = new Doc({ name: req.body.name });
    docC.save(function (err, results) {
      if (err) return console.error(err);
      // console.log(results + " saved to users collection.");
      var doc = connection.get('cse356', results._id.valueOf());
      doc.fetch(function (err) {
        if (err) throw err;
        if (doc.type === null) {
          doc.create([], 'rich-text');
          // console.log("create doc.id: ", doc.id);
          // cse356docs.findById(results._id.valueOf())
          // docs.push(req.body.name);
        }
      });
      // console.log("create doc.version: ", doc.version);
      res.json({ docid: results._id.valueOf() });
    });
  } else {
    res.json({ error: true, message: "not login yet" });
  }
})

collection_router.post("/collection/delete", async (req, res) => {
  if (req.session.user) {
    res.set("X-CSE356", "61fa44e173ba724f297dbbb9");
    console.log("collection/delete: ", req.body);
    var doc = connection.get('cse356', req.body.docid);
    console.log("doc.id: ", doc.id);
    if (doc.type === null) {
      console.log("delete doc does not exist");
      res.json({ error: true, message: 'delete doc does not exist' });
    } else {
      console.log("delete doc: ", req.body.docid);
      doc.del();
      let docD = await Doc.deleteOne({ _id: req.body.docid });
      res.json({ status: 'OK' });
    }
  } else {
    res.json({ error: true, message: "not login yet" });
  }

})

collection_router.get("/collection/list", async (req, res) => {
  console.log("collection list: ", req.session.user);
  var list = [];
  if (req.session.user) {
    console.log("/collection/list: ", req.body);
    res.set("X-CSE356", "61fa44e173ba724f297dbbb9");
    var docs = cse356docs.find({}, { _id: 1, '_m.mtime': 1 }, { sort: { '_m.mtime': -1 }, limit: 10 }, async function (err, result) {
      if (err) throw err;
      console.log(result);
      for (var i = 0; i < result.length; i++) {
        console.log(result[i]._id.valueOf());
        let id = result[i]._id.valueOf();
        let docD = await Doc.findById(id);
        console.log("docD ", docD);
        list[i] = { id: id, name: docD.name }
      }

      res.json(list);
    });
    // res.json([]);
  } else {
    res.json({ error: true, message: "not login yet" });
  }

});

module.exports = collection_router