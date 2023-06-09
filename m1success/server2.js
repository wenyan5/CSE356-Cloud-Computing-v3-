

var http = require('http');
var express = require('express');
var ShareDB = require('sharedb');
var richText = require('rich-text');
var WebSocket = require('ws');
var WebSocketJSONStream = require('@teamwork/websocket-json-stream');
const cookies = require("cookie-parser")
const bodyParser = require('body-parser');
const { Delta } = require('rich-text');
var QuillDeltaToHtmlConverter = require('quill-delta-to-html').QuillDeltaToHtmlConverter;
// var ReconnectingWebSocket = require('reconnecting-websocket');
// var sharedb = require('sharedb/lib/client');
// var Quill = require('quill');
// sharedb.types.register(richText.type);

// // Open WebSocket connection to ShareDB server
// var socket = new ReconnectingWebSocket('ws://' + window.location.host);
// var connection = new sharedb.Connection(socket);

const app = express();
app.use(express.static('static'));
app.use(express.static('node_modules/quill/dist'));

// app.use(express.json());
app.use(cookies());
// app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
let server = http.createServer(app);

ShareDB.types.register(richText.type);
var backend = new ShareDB();
createDoc(startServer);

// Create initial document then fire callback
function createDoc(callback) {
  var connection = backend.connect();
  var doc = connection.get('examples', 'richtext');
  doc.fetch(function (err) {
    if (err) throw err;
    if (doc.type === null) {
      doc.create([], 'rich-text', callback);
      return;
    }
    callback();
  });
}

function startServer() {
  // Create a web server to serve files and listen to WebSocket connections


  // Connect any incoming WebSocket connection to ShareDB
  var wss = new WebSocket.Server({ server: server });
  wss.on('connection', function (ws) {
    var stream = new WebSocketJSONStream(ws);
    backend.listen(stream);
  });

  let webPort = 80
  server.listen(webPort);
  console.log(`Website Listening on http://localhost:${webPort}\n\n`);
}

const PORT = 80;

let clients = new Set();
let facts = [];

function eventsHandler(request, response, next) {
  const headers = {
    'Content-Type': 'text/event-stream', //application/json
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',

  };
  response.set('X-CSE356', "62463856124df91434e0c34e");
  response.writeHead(200, headers);

  let idx = request.params.id;
  // if (clients.has(idx)) {
  //   return response.send();
  // }
  // clients.add(idx);

  var connection = backend.connect();
  console.log(`${idx} Connected`);
  var doc = connection.get('examples', 'richtext');
  
  doc.subscribe(function (err) {
    if (err) throw err;
    console.log("/connect connected:", doc.data.ops);
    let data = `data:${JSON.stringify({ "content": doc.data.ops })}\n\n`;
  response.write(data);
    doc.on('op', function (op, source) {
      console.log("/connect op:", op.ops);
      data = `data:${JSON.stringify([op.ops])}\n\n`;
      response.write(data);
    });
  });


  request.on('close', () => {
    console.log(`${idx} Connection closed`);
    connection.close();
    //response.status(200).send();
  });
}

app.get('/connect/:id', eventsHandler);


app.post("/op/:id", async (req, res) => {
  let idx = req.params.id;
  let oplist = req.body;
  console.log("/op req.body:", oplist);

  var connection = backend.connect();
  var doc = connection.get('examples', 'richtext');
  doc.fetch(function (err) {
    if (err) throw err;
    for (const ops of oplist) {
      doc.submitOp({ "ops": ops });
    }

  });

  res.set('X-CSE356', "62463856124df91434e0c34e");
  return res.status(200).send();
});

app.get("/doc/:id", async (req, res) => {
  let idx = req.params.id;
  var connection = backend.connect();
  var doc = connection.get('examples', 'richtext');
  doc.fetch(function (err) {
    if (err) throw err;
    let delta = doc.data;

    var cfg = {};

    var converter = new QuillDeltaToHtmlConverter(delta.ops, cfg);

    var html = converter.convert();

    console.log("/doc text:", delta, ":", html);
    res.set('X-CSE356', "62463856124df91434e0c34e");
    return res.status(200).send(html);
  });


});

