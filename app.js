var http = require('http');
var path = require('path');
var express = require('express');
var logger = require('morgan');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var passport = require('passport');
var session = require('express-session');
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017";

var app = express();

app.set('views', path.resolve(__dirname, 'views'));
app.set("view engine", "ejs");

app.use(logger("dev"));

app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(session({
	secret: "secretSession",
	resave: true,
	saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done){
	done(null, user);
});

passport.deserializeUser(function(user, done){
	done(null, user);
});

LocalStrategy = require('passport-local').Strategy;
passport.use(new LocalStrategy({
	usernameField:'',
	passwordField:''
	},
	function(username, password, done){
		MongoClient.connect(url, function(err, db){
			if(err) throw err;
			
			var dbObj = db.db("Users");
			
			dbObj.collection("users").findOne({username:username}, function(err, results){
				if(results.password === password){
					var user = results;
					done(null, user);
				}
				else{
					done(null, false, {message: "Bad Password"});
				}
			});
		});	
	}));

function ensureAuthenticated(request, response, next){
	if(request.isAuthenticated()){
		next();
	}
	else{
		response.redirect("/sign-up");
	}
}
	
app.get("/logout", function(request, response){
	request.logout();
	response.redirect("/");
});
	
app.get("/", ensureAuthenticated, function(req, res){
	MongoClient.connect(url, function(err, db){
		if(err) throw err;
		
		var dbObj = db.db("Users");
		
		dbObj.collection("foods").find({name: req.user.username}).toArray(function(err, results){
			console.log("Site served");
			db.close();
			res.render("index",{food:results, title: "index", username: req.user.username});
		});
	});
	
});

app.get("/new-entry", ensureAuthenticated, function(req, res){
	res.render("new-entry", {title: "newEntry", username: req.user.username });
});

app.get("/login", function(req, res){
	res.render("login", {title: "login"});
});

app.get("/sign-up", function(req, res){
    res.render("sign-up", {title: "sign-up"});
});

app.post("/new-entry", function(req, response){
	if(!req.body.title){
		response.status(400).send("Entries must have some text!");
		return;
	}
	
	MongoClient.connect(url, function(err, db){
		if(err) throw err;
		
		var dbObj = db.db("Users");
		var data = {
            body: req.body.title,
            name: req.user.username
        }
		dbObj.collection("foods").save(data, function(err, result){
			console.log("Data saved");
			db.close();
			response.redirect("/");
		});
	});
});

app.post("/sign-up", function(request, response){
	console.log(request.body);
	MongoClient.connect(url, function(err, db){
		if(err) throw err;
		
		var dbObj = db.db("Users");
		
		var user = {
			username: request.body.username,
			password: request.body.password
		};
		
		dbObj.collection("users").insert(user, function(err, results){
			if(err) throw err;
			
			request.login(request.body, function(){
			response.redirect("/");
			});
		});
	});
});

app.post("/login", passport.authenticate("local", {
	failureRedirect:"/login",
	}), function(request, response){
		response.redirect("/");
	});

app.use(function(req, res){
	res.status(404).render("404");
});

http.createServer(app).listen(3000, function(){
	console.log("food libray server started on port 3000");
});