var http = require('http');
var express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const cookieParser = require('cookie-parser');
var session = require('express-session')
var ShareDB = require('sharedb');
var sharedb = require('sharedb/lib/client');
var richText = require('rich-text');
var WebSocket = require('ws');
var WebSocketJSONStream = require('websocket-json-stream');
var QuillDeltaToHtmlConverter = require('quill-delta-to-html').QuillDeltaToHtmlConverter;
sharedb.types.register(richText.type);
ShareDB.types.register(richText.type);
const ShareDbMongo = require('sharedb-mongo');
const login_router = require("./routers/login")
const collection_router = require("./routers/collection")
const media_router = require("./routers/media")


const User = require("./models/User")
const Doc = require("./models/Doc")
const Image = require("./models/Image")

var mongoose = require('mongoose');
var mongoDB = 'mongodb://127.0.0.1/cse356';
mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', function () {
  console.log("Connection Successful!");
});

var backend = ShareDB({
  presence: true,
  doNotForwardSendPresenceErrorsToClient: true,
  db: new ShareDbMongo("mongodb://localhost:27017/cse356")
});
var connection = backend.connect();

var app = express();
app.use(cors());
app.use(express.json());
app.use(session({
  secret: 'keyboard cat', resave: false,
  saveUninitialized: true, cookie: { maxAge: 1000 * 60 * 60 * 24 }
}))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('static'));
app.use(express.static('node_modules/quill/dist'));

app.set('view engine', 'ejs');
app.use("/", login_router)
app.use("/", collection_router)
app.use("/", media_router)

var server = http.createServer(app);
const clients = new Map();

// Connect any incoming WebSocket connection to ShareDB
var wss = new WebSocket.Server({ server: server });
wss.on('connection', function (ws, req) {
  var stream = new WebSocketJSONStream(ws);
  backend.listen(stream);
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/static/index.html');
});
app.get("/home", (req, res) => {
  if (req.session.user) {
    console.log("home: ", req.body);
    res.set("X-CSE356", "61fa44e173ba724f297dbbb9");
    res.json();
  } else {
    res.json({ error: true, message: "not login yet" });
  }
});

app.post("/doc/presence/:DOCID/:UID", (req, res) => {
  console.log("presence doc------");
  if (req.session.user) {
    var id = req.params.DOCID;
    var index = req.body.index;
    var length = req.body.length;
    var cursor = { index: index, length: length, name: req.session.user.name };
    // console.log("cursor:", cursor);
    console.log("/doc/presence: ", req.body);
    res.set("X-CSE356", "61fa44e173ba724f297dbbb9");
    // const presence = conn.getPresence("cse356", req.params.DOCID)
    // var localPresence = clients.filter(c => c.UID === req.params.UID)[0].localPresence
    var localPresence = clients.get(req.params.UID).localPresence;
    // console.log("submit start!!!!!!!!");
    localPresence.submit(cursor, function (err) {
      if (err) {
        res.json({ error: true, message: "err" })
      }
      else
        res.json({ status: "ok" });
    });
    // console.log("submit end!!!!!!!!");
  } else {
    res.json({ error: true, message: "not login yet" });
  }
});


app.get("/doc/edit/:DOCID", (req, res) => {
  if (req.session.user) {
    console.log("/doc/edit/:DOCID: ", req.body);
    res.set("X-CSE356", "61fa44e173ba724f297dbbb9");
    res.render('index.ejs', { 'id': req.params.DOCID });
  } else {
    res.json({ error: true, message: "not login yet" });
  }
});

app.get('/doc/connect/:DOCID/:UID', function (req, res) {
  if (req.session.user) {
    res.set("X-CSE356", "62463856124df91434e0c34e");
    console.log("connect opId: " + req.params.DOCID + "connect UID: " + req.params.UID);

    const headers = {
      'Content-Type': 'text/event-stream',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no'
    };
    res.writeHead(200, headers);

    const socket = new WebSocket('ws://localhost:80');
    const conn = new sharedb.Connection(socket);
    const doc = conn.get('cse356', req.params.DOCID);

    console.log("connect content", doc.data);
    doc.subscribe(function (err) {
      if (err) throw err;
      let data = `data:${JSON.stringify({ "version": doc.version, "content": doc.data.ops })}\n\n`;
      res.write(data);
    });

    doc.on('op', function (op, source) {
      var opWWW = (Array.isArray(op)) ? op : (op.ops || []);
      // console.log("source: ",source);
      if (source) {
        // console.log(req.params.UID, source, JSON.stringify({"ack":opWWW}));
        res.write(`data:${JSON.stringify({ "ack": opWWW })}\n\n`);
      } else {
        // console.log(req.params.UID, source, JSON.stringify(opWWW));
        res.write(`data:${JSON.stringify(opWWW)}\n\n`);
      }
    });

    const presence = conn.getDocPresence('cse356', req.params.DOCID)
    var localPresence = presence.create(req.params.UID);
    presence.subscribe(function (err) {
      // console.log("yeah the presence subscribe!!");
      if (err) throw err;
    })
    presence.on('receive', function (id, cursor) {
      // console.log("/receive presence:", cursor);
      let data = `data:${JSON.stringify({ presence: { id, cursor } })}\n\n`;
      // console.log("presence data:-> " , data);
      res.write(data);
    });
    const newClient = {
      DOCID: req.params.DOCID, UID: req.params.UID, res, doc, localPresence
    };
    clients.set(req.params.UID, newClient);

    req.on('close', () => {
      console.log(`${req.params.UID} Connection closed`);
      conn.close();
      // console.log("clients.length : ",clients.length, 'before filter', req.params.UID, req.params.DOCID );
      // clients = clients.filter(client => (client.UID != req.params.UID || client.DOCID != req.params.DOCID));
      clients.delete(req.params.UID);
      // console.log("clients.length : ",clients.length, 'after filter' );
    });
  } else {
    res.json({ error: true, message: "not login yet" });
  }

})

app.post('/doc/op/:DOCID/:UID', function (req, res) {
  if (req.session.user) {
    res.set("X-CSE356", "62463856124df91434e0c34e");
    const opAdd = req.body.op;
    console.log("op req ops: ", req.body.op);
    //var doc = connection.get('cse356', req.params.DOCID);
    //  const doc= clients.filter(c => c.UID === req.params.UID)[0].doc
    const doc = clients.get(req.params.UID).doc;
    // console.log("op doc.version: " + doc.version + " op  rquest.version: " + req.body.version);
    if (doc.version != req.body.version) {
      res.json({ status: "retry" });
    } else {
      doc.submitOp(opAdd);
      res.json({ status: "ok" });
    }
  } else {
    res.json({ error: true, message: "not login yet" });
  }
})


app.get('/doc/get/:DOCID/:UID', function (req, res) {
  if (req.session.user) {
    res.set("X-CSE356", "62463856124df91434e0c34e");
    // var doc = clients.filter(c => c.UID === req.params.UID && c.DOCID === req.params.DOCID)[0].doc
    var doc = clients.get(req.params.UID).doc;
    // console.log("docId: ", req.params.DOCID);
    console.log(" get doc.data ", doc.data.ops);
    doc.fetch(function (err) {
      if (err) throw err;
      if (doc.type === null) {
        doc.create([], 'rich-text');
      }
      var cfg = {};
      var converter = new QuillDeltaToHtmlConverter(doc.data.ops, cfg);
      var html = converter.convert();
      console.log("html:", html);
      return res.send(html);
    })
  } else {
    res.json({ error: true, message: "not login yet" });
  }
});

app.get('/index/search', function (req, res) {
  
});


const host = "209.94.59.121"
const PORT = 80;
server.listen(80);
console.log('Listening on http://209.94.59.121:80');