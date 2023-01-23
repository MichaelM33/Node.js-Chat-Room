const path = require("path");
const http = require("http");
const express = require("express");
const passport = require('passport')
const socketio = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = socketio(server);
const methodOverride = require('method-override')
const mongoose = require("mongoose")
const db = 'mongodb+srv://mj33:test@cluster0.rmklcot.mongodb.net/?retryWrites=true&w=majority'


mongoose.connect(db, { useNewUrlParser: true})
.then(() => console.log('Mongo Db Connected'))
.catch(err => console.log(err));



const bcrypt = require('bcrypt')
const flash = require('express-flash')
const session = require('express-session')


app.set('view-engine', 'ejs')
app.use(express.urlencoded({extended: false}))
app.use(flash())
app.use(methodOverride('_method'))
app.use(session({
  secret: "3178sghwu347",
  resave: false,
  saveUninitialized: false
}))


require('./passport-config')(passport)


app.use(passport.initialize())
app.use(passport.session())



app.get('/', checkAuthenticated, (req, res) =>{
  console.log(req.username)
  res.render('home.ejs', {username: req.user.username})
});


app.get('/register', checkNotAuthenticated, (req, res) =>{
  res.render('register.ejs')
});

app.get('/login', checkNotAuthenticated, (req, res) =>{
  res.render('login.ejs')
});

app.get('/chat', checkAuthenticated, (req, res) =>{
  res.render('chat.ejs', {username: req.user.username})
});



app.post('/login', (req, res, next) => { passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
})(req, res, next);
});

app.post('/register', async (req, res) => {

  const hashedPassword = await bcrypt.hash(req.body.password, 10)
  
    User.findOne({username: req.body.username})
    .then(user => {
      if (user){
        console.log("User Already Registered")
        res.redirect('/login?error=user-already-registered')
      }
      else{

        const newUser = new User({
          name: req.body.username,
          username: req.body.username,
          password: hashedPassword
        })
    
        newUser.save()
        .then(user => { 
          console.log("User Registered & Added to the DB!")
          res.redirect('/login')
        })
        .catch(err => console.log(err));

      }
    })
})


function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()){
  
    return next()
  }

  res.redirect('/login')
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()){
    return res.redirect('/')
  }
  next()

}



app.delete('/logout', (req, res) => {
  req.logOut()
  res.redirect('/login')
})


const moment = require('moment');
const User = require("./models/User");
function formatMessage(username, text) {
  return {
    username,
    text,
    time: moment().format('h:mm a')
  };
}


const socket_users = [];
// Join user to chat
function userJoin(id, username, room) {
  const user = { id, username, room };
  socket_users.push(user);
  return user;
}
// Get current user
function getCurrentUser(id) {
  return socket_users.find(user => user.id === id);
}
// User leaves chat
function userLeave(id) {
  const index = socket_users.findIndex(user => user.id === id);
  if (index !== -1) {
    return socket_users.splice(index, 1)[0];
  }
}
// Get room users
function getRoomUsers(room) {
  return socket_users.filter(user => user.room === room);
}



const botName = "System";

// Run when client connects
io.on("connection", (socket) => {
  console.log(io.of("/").adapter);
  socket.on("joinRoom", ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    if (user) {
      io.to(user.room).emit("message", formatMessage(botName, `${user.username} has joined the chat`));
    }

    // Send users and room info
    io.to(user.room).emit("roomUsers", {
      room: user.room,
      socket_users: getRoomUsers(user.room),
    });
  });

  // Listen for chatMessage
  socket.on("chatMessage", (msg) => {
    const user = getCurrentUser(socket.id);

    io.to(user.room).emit("message", formatMessage(user.username, msg));
  });

  // Runs when client disconnects
  socket.on("disconnect", () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        formatMessage(botName, `${user.username} has left the chat`)
      );

      // Send users and room info
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        socket_users: getRoomUsers(user.room),
      });
    }
  });
});

const PORT = 3000;

server.listen(PORT, () => console.log(`Running on ${PORT}`));
