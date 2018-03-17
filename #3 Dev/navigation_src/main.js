const express = require('express');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const app = express();
var md5 = require('md5');   // 암호화 모듈
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const multer = require('multer');

const http=require('http');
const https = require('https');
const fs = require('fs');

var _storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'upload/' + req.session.username);
  },
  filename: function(req, file, cb) {
    var idx = file.originalname.lastIndexOf(".");
    cb(null, file.fieldname + '-' + Date.now() + file.originalname.substring(idx));
  }
});
var upload = multer({storage: _storage});   // 목적지


const mysql      = require('mysql');
var conn = mysql.createConnection({
   host     : 'localhost',
   user     : 'root',
   password : '1324803',
   database : 'remember_travel_db'
});
conn.connect();

var port1 = 80;
var port2 = 443;    // https를 위한 포트
var longitude, latitude;

var options = {
    key: fs.readFileSync('keys/key.pem'),
    cert: fs.readFileSync('keys/cert.pem')
};

http.createServer(app).listen(port1, function(){
  console.log("Http server listening on port " + port1);
});


https.createServer(options, app).listen(port2, function(){
  console.log("Https server listening on port " + port2);
});

function createFolder(folder, createFolder){
	var tgFolder = path.join(folder, createFolder);
	console.log("createFolder ==> " + tgFolder);
	fs.mkdir(tgFolder, 0666, function(err){
		if(err){
			return false;
		}else{
			console.log('create newDir');
			return true;
		}
	});
}

app.locals.pretty = true;
app.set('view engine', 'jade');
app.set('views', './views');
// routing setting
app.use(express.static(path.join(__dirname, 'views')));
app.use(bodyParser.urlencoded({extended: false}));

app.use(session( {
  secret: 'afdsffjeklwrjql#!@#@!#!@',  // 암호화
  resave: false,  // sesion id를 접속할때 새롭게 발급하지 않는다.
  saveUninitialized: true // session id를 세션을 실제로 사용하기 전까지는 발급하지 말라
}));

app.use(passport.initialize());
app.use(passport.session()); // 세션 사용후 코드를 놔두어야 한다.

app.get('/', function(req, res){
    res.render('home');
})

app.get('/home', function(req, res){
  console.log('test');
  if (req.session.nickname)
    res.render('home_login', {nickname: req.session.nickname});
  else
    res.render('home');
});

app.get('/logout', function(req, res){
  console.log('test');
  req.session.username = null;
  req.session.nickname = null;
  res.redirect('/home');
});

// app.post('/home', passport.authenticate( // 미들 웨어가 함수를 만들어줌
//   'local',    // passport 전략 중 local이 실행된다.
//   { successRedirect: '/work',
//     failureRedirect: '/home',
//     failureFlash: false }) // done에서 던진 인증 메시지를 준다.
// );

app.post('/home', function(req, res) {
  console.log('in post');
  var username = req.body.username;
  var password = md5(req.body.password);

  var sql = 'select * from user';

  conn.query(sql, function (error, users, fields) {
    if (error) {
      console.log(err);
    }
    else {
      for (var i=0; i < users.length; ++i) {
        // console.log(rows[i].username);
        console.log(password);
        console.log(users[i].password);
        console.log(username);
        console.log(users[i].username);
        if (users[i].username === username && users[i].password === password)
        {
          req.session.username = username;
          req.session.nickname = users[i].nickname;
          return req.session.save(function() {
            console.log(req.session.nickname);
            res.redirect('/loc');
          })
        }
      }
      console.log('wrong ')
      res.render('home');
      // console.log('fields', fields);
    }
  });
});

app.get('/register', function(req, res) {
  res.render('register');
});


app.post('/register', function(req, res) {
  var sql = 'insert into user (username, password, nickname) values(?, ?, ?)';
  console.log(req.body.password);
  console.log(md5(req.body.password));

  var params = [req.body.username, md5(req.body.password), req.body.nickname];
  conn.query(sql, params, function (error, rows, fields) {
    if (error) {
      console.log(error);
    }
    else {
      console.log(rows);
      req.session.username = req.body.username;
      req.session.nickname = req.body.nickname;

      dir = "./upload/" + req.body.username;
      if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
      }

      req.session.save(function() {
        res.redirect('/loc');
      });
    }
  });
});

app.get('/work', function(req, res){
  if (req.session.username) {
    longitude = req.query.longitude;
    latitude = req.query.latitude;
    console.log(longitude, latitude);
    res.render('work', {latitude:latitude, longitude:longitude});
  }
  else {
    res.redirect('/home');
  }
});

app.get('/about', function(req, res){
    res.render('about');
});

app.get('/contact', function(req, res){
    res.render('contact');
});

app.get('/loc', function(req, res){
    res.render('location');
});

// 파일 업로드
app.get('/upload', function(req, res) {
  console.log(latitude, longitude);
  res.render('upload');
});

app.post('/upload', upload.single('picture'), function(req, res) { // single인자로 file name에 지정된 값을 설정
  console.log(req.file);
  var sql = 'insert into user (username, password, nickname, salt) values(?, ?, ?, ?)';
  res.send('aa' + req.file);
});

// port setting
app.listen(3000, function () {
    console.log('Connected 3000 port!');
});
