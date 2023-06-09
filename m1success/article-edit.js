var sharedb = require('sharedb/lib/client');
var richText = require('rich-text');
var Quill = require('quill');

function uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

sharedb.types.register(richText.type);

// Open WebSocket connection to ShareDB server
var socket = new WebSocket('ws://' + window.location.host);
var connection = new sharedb.Connection(socket);

// For testing reconnection
var socket = new WebSocket('ws://localhost:80');
var connection = new sharedb.Connection(socket);

var doc = connection.get('collaborative_community', "file");
const uuid = uuidv4()
const source = new EventSource(`http://209.94.57.178/connect/${uuid}`);


source.addEventListener('open', () => {
  console.log('SSE opened!');
});

source.addEventListener('message', (e) => {
  console.log("Event Source: " + e.data);
});

doc.subscribe(function(err) {
  if (err) throw err;
  // var quill = new Quill('#editor', {theme: 'snow'});

  var toolbarOptions = [
    ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
    ['blockquote', 'code-block'],
  
    [{ 'header': 1 }, { 'header': 2 }],               // custom button values
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
    [{ 'indent': '-1'}, { 'indent': '+1' }],          // outdent/indent
    [{ 'direction': 'rtl' }],                         // text direction
  
    [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
  
    [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
    [{ 'font': [] }],
    [{ 'align': [] }],
  
    ['clean'],
    ['link', 'image', 'video']                                        // remove formatting button
  ];
  
  var quill = new Quill('#editor', {
    modules: {
      toolbar: toolbarOptions
    },
    theme: 'snow'
  });
  
  quill.setContents(doc.data);
  quill.on('text-change', function(delta, oldDelta, source) {
    if (source !== 'user') return;
    // doc.submitOp(delta, {source: quill});
    postData(`http://209.94.57.178/op/${uuid}`, [delta.ops])
  });
  doc.on('op', function(op, source) {
    if (source === quill) return;
    console.log(source)
    quill.updateContents(op);
  });
});


async function postData(url = '', data = {}) {
  // Default options are marked with *
  const response = await fetch(url, {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    headers: {
      'Content-Type': 'application/json'
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: JSON.stringify(data) // body data type must match "Content-Type" header
  });
  return response
}
