const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const users = new Map();
const messages = [];

const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>MatChat</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;background:#0e0f13;color:#fff}
.wrap{max-width:900px;margin:auto;height:100vh;display:flex;flex-direction:column}
header{padding:16px 18px;background:#171922;border-bottom:1px solid #2a2d38;display:flex;justify-content:space-between;align-items:center}
.logo{font-size:22px;font-weight:700}.online{font-size:13px;color:#8fa3bf}
main{flex:1;display:flex;min-height:0}.side{width:250px;background:#151720;border-right:1px solid #2a2d38;padding:15px}
.side input,.login input,.composer input{width:100%;padding:12px;border:1px solid #343846;border-radius:12px;background:#0e1016;color:#fff;outline:none}
.user{padding:13px;margin-top:10px;border-radius:12px;background:#202330;cursor:pointer}.user small{display:block;color:#8991a4;margin-top:4px}
.chat{flex:1;display:flex;flex-direction:column;min-width:0}.messages{flex:1;overflow:auto;padding:18px}
.msg{max-width:75%;padding:10px 13px;margin:8px 0;border-radius:14px;background:#252938}.msg.me{margin-left:auto;background:#355a91}.meta{font-size:11px;color:#aeb5c5;margin-bottom:4px}
.composer{padding:12px;border-top:1px solid #2a2d38;display:flex;gap:8px}.composer input{flex:1}.composer button,.login button{border:0;border-radius:12px;background:#4c8bf5;color:white;padding:0 18px;font-weight:700}
.login{position:fixed;inset:0;background:#0e0f13;display:flex;align-items:center;justify-content:center;padding:20px}.loginbox{width:min(390px,100%);background:#171922;padding:25px;border-radius:20px}.login h1{margin-top:0}.login input{margin:7px 0}.login button{height:45px;width:100%;margin-top:8px}
@media(max-width:650px){.side{width:145px;padding:10px}.msg{max-width:88%}.side .user{font-size:13px}}
</style>
</head>
<body>
<div id="login" class="login">
 <div class="loginbox">
  <h1>MatChat</h1>
  <p>Вход в мессенджер</p>
  <input id="email" type="email" placeholder="Email">
  <input id="name" placeholder="Имя">
  <button onclick="login()">Войти</button>
  <p style="font-size:12px;color:#8f96a8">Демо: реальная отправка email-кодов пока не подключена.</p>
 </div>
</div>
<div class="wrap" id="app" style="display:none">
<header><div class="logo">MatChat</div><div class="online" id="status">Подключение...</div></header>
<main>
 <aside class="side">
  <input id="search" placeholder="Поиск">
  <div class="user" onclick="selectChat('general')">💬 Общий чат<small>MatChat</small></div>
  <div class="user" onclick="selectChat('demo')">👤 Demo Chat<small>Тестовый чат</small></div>
 </aside>
 <section class="chat">
  <div class="messages" id="messages"></div>
  <form class="composer" onsubmit="sendMessage(event)">
   <input id="text" autocomplete="off" placeholder="Написать сообщение...">
   <button>➤</button>
  </form>
 </section>
</main>
</div>
<script src="/socket.io/socket.io.js"></script>
<script>
let me=null, room="general", socket=null;
function login(){
 const email=document.getElementById('email').value.trim();
 const name=document.getElementById('name').value.trim()||email.split('@')[0];
 if(!email)return alert('Введите email');
 me={email,name};
 document.getElementById('login').style.display='none';
 document.getElementById('app').style.display='flex';
 socket=io();
 socket.on('connect',()=>{document.getElementById('status').textContent='Онлайн';socket.emit('join',{room,user:me});});
 socket.on('disconnect',()=>document.getElementById('status').textContent='Нет соединения');
 socket.on('history',list=>{document.getElementById('messages').innerHTML='';list.forEach(render)});
 socket.on('message',render);
}
function selectChat(r){room=r;if(socket){socket.emit('join',{room,user:me})}}
function sendMessage(e){
 e.preventDefault();const input=document.getElementById('text');const text=input.value.trim();
 if(!text||!socket)return;socket.emit('message',{room,user:me,text});input.value='';
}
function render(m){
 const box=document.getElementById('messages');const d=document.createElement('div');
 d.className='msg '+(m.user.email===me.email?'me':'');
 d.innerHTML='<div class="meta">'+escapeHtml(m.user.name)+'</div>'+escapeHtml(m.text);
 box.appendChild(d);box.scrollTop=box.scrollHeight;
}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
</script>
</body></html>`;

app.get("/", (_, res) => res.type("html").send(html));
app.get("/health", (_, res) => res.json({ ok: true, app: "MatChat" }));

io.on("connection", socket => {
  socket.on("join", ({room, user}) => {
    for (const r of socket.rooms) if (r !== socket.id) socket.leave(r);
    socket.join(room);
    socket.emit("history", messages.filter(m => m.room === room).slice(-100));
    users.set(socket.id, user);
  });
  socket.on("message", data => {
    if (!data || !data.text || !data.user || !data.room) return;
    const m = { room:data.room, user:data.user, text:String(data.text).slice(0,2000), time:Date.now() };
    messages.push(m);
    io.to(data.room).emit("message", m);
  });
  socket.on("disconnect", () => users.delete(socket.id));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => console.log("MatChat listening on " + PORT));
