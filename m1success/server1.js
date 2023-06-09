var http = require('http');
var express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
var ShareDB = require('sharedb');
var richText = require('rich-text');
var WebSocket = require('ws');
var WebSocketJSONStream = require('websocket-json-stream');
var QuillDeltaToHtmlConverter = require('quill-delta-to-html').QuillDeltaToHtmlConverter;


ShareDB.types.register(richText.type);

// const db = require('sharedb-mongo')('mongodb://localhost:27017/test');
// var backend = new ShareDB({db});
var backend = new ShareDB({});

var app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static('static'));
app.use(express.static('node_modules/quill/dist'));

app.set('view engine', 'ejs');

var connection = backend.connect();

var server = http.createServer(app);
let clients = [];
let ops = [];
var doc = connection.get('collaborative_community', 'file');

// Connect any incoming WebSocket connection to ShareDB
var wss = new WebSocket.Server({server: server});
wss.on('connection', function(ws, req) {
  var stream = new WebSocketJSONStream(ws);
  backend.listen(stream);
});

app.get('/', function(req, res) {
  res.set("X-CSE356", "62463856124df91434e0c34e");
  console.log("ttttt sart!");
  var doc = connection.get('collaborative_community', 'file');
  doc.fetch(function(err) {
    if (err) throw err;
    if (doc.type === null) {
      doc.create([{insert: ''}], 'rich-text');
      return;
    }
  });
  res.render('index.ejs', {'id': '0'});
})



app.get('/connect/:id', function(req, res) {
    res.set("X-CSE356", "62463856124df91434e0c34e");
    console.log("opId: ", req.params.id);
    var doc = connection.get('collaborative_community', 'file');
    
    const headers = {
      'Content-Type': 'text/event-stream',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering':'no'
    };
    res.writeHead(200, headers);


    doc.fetch(function(err) {
        if (err) throw err;
        if (doc.type === null) {
          doc.create([], 'rich-text');
        }
    })
    // const data = `{data:${JSON.stringify({'content':doc.data.ops})}}\n\n`;
    // console.log("data: ", data);
    // res.write(data);
    doc.subscribe(function (err) {
        if (err) throw err;
        console.log("/connect connected:", doc.data.ops);
        let data = `data:${JSON.stringify({ "content": doc.data.ops })}\n\n`;
        res.write(data);
        doc.on('op', function (op, source) {
            console.log("/connect op:", op.ops);
            data = `data:${JSON.stringify([op.ops])}\n\n`;
            res.write(data);
        });
  
    const clientId = req.params.id;
    const newClient = {
      id: clientId,
      res
    };
    clients.push(newClient);

  });
  // req.on('close', () => {
  //     console.log(`${req.params.id} Connection closed`);
  //     clients = clients.filter(client => client.id !== req.params.id);
  // });
})

app.post('/op/:id', function(req, res) {
  res.set("X-CSE356", "62463856124df91434e0c34e");
  const newFact = req.body;
  console.log("ops: ",req.body);
  doc.fetch(function(err) {
    if (err) throw err;
    if (doc.type === null) {
      doc.create([], 'rich-text');
    }
    if(newFact!= null){
      for(var i =0; i< newFact.length; i++){
        // console.log("newFact " + i  + ": " + newFact[i]);
        ops.push(newFact[i]);
        doc.submitOp( newFact[i])
      }
      // res.json(newFact);
      // return sendEventsToAll(newFact);
    clients.forEach(client => {
        if(client.id != req.params.id){
            client.res.write(`data: ${JSON.stringify(req.body)}\n\n`
            )
        }
    })
    res.send()
    }
  });
  
})


app.get('/doc/:id', function(req, res) {
  res.set("X-CSE356", "62463856124df91434e0c34e");
  console.log("docId: ", req.params.id);
  console.log("doc.data.ops ", doc.data.ops);
  doc.fetch(function (err) {
    if (err) throw err;
    if (doc.type === null) {
      doc.create([], 'rich-text');
    }
  // var html = editor.root.innerHTML;
    var cfg = {};
    var converter = new QuillDeltaToHtmlConverter(doc.data.ops, cfg);
    var html = converter.convert(); 
    console.log("html:", html);
    return res.send(html);
  })
});


const host = "209.94.57.178"
const PORT = 80;
server.listen(80);
console.log('Listening on http://209.94.57.178:80');