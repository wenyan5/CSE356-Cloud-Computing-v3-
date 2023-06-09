var sharedb = require('sharedb/lib/client');
var richText = require('rich-text');
var Quill = require('quill');
var QuillCursors = require('quill-cursors');
var tinycolor = require('tinycolor2');
var ObjectID = require('bson-objectid');
sharedb.types.register(richText.type);
Quill.register('modules/cursors', QuillCursors);

// Open WebSocket connection to ShareDB server
var socket = new WebSocket('ws://' + window.location.host);
var connection = new sharedb.Connection(socket);
const Esource = new EventSource(`http://209.94.57.178/doc/connect/${id}/:UID`);
// const cursorSse = new EventSource(`http://209.94.57.178/presence/${DOCID}/UID`);

Esource.addEventListener('open', () => {
  console.log('SSE opened!');
});
Esource.onmessage = (e) => { }
// evtSource.onmessage = (e) => {
//     const ops = JSON.parse(e.data);
//     if (Array.isArray(ops)) {
//         // subsequent messages
//         updateContents(ops);
//     } else {
//         // initial messages
//         console.log('initial messages');
//         setContents(ops.content);
//     }
// }

// quill.on('text-change', textChange);

// function updateContents(delta) {
//     delta.forEach(d => {
//         quill.updateContents(d, 'silent'); 
//     });
// }

// function setContents(delta) {
//     quill.setContents(delta, 'silent');
// }

// async function textChange(delta, oldDelta, source) {
//     const data = JSON.stringify([delta.ops]);
//     await fetch('/op/conn_id_' + timestamp, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json'
//         },
//         body: data
//     });
// }

// doc.subscribe(function(err) {
//   if (err) throw err;
//   // var quill = new Quill('#editor', {theme: 'snow'});
var doc = connection.get('cse356', id);
doc.subscribe(function (err) {
  if (err) throw err;
  var quill = new Quill('#editor', { theme: 'snow' });

  var toolbarOptions = [
    ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
    ['blockquote', 'code-block'],

    [{ 'header': 1 }, { 'header': 2 }],               // custom button values
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'script': 'sub' }, { 'script': 'super' }],      // superscript/subscript
    [{ 'indent': '-1' }, { 'indent': '+1' }],          // outdent/indent
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
      toolbar: toolbarOptions,
      cursors: true,
      presence: true
    },
    theme: 'snow'
  });
  var cursors = quill.getModule('cursors');

  quill.setContents(doc.data);
  quill.on('text-change', async function (delta, oldDelta, source) {
    // if (source !== 'user') return;
    // doc.submitOp(delta, {source: quill});
    const data = JSON.stringify([delta.ops]);
    await fetch(`doc/op/${id}/:UID`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: data
    });
  });
  quill.on('selection-change', function (range, oldRange, source) {



  });
  doc.on('op', function (op, source) {
    if (source === quill) return;
    quill.updateContents(op);
  });

// });