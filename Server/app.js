var express = require('express');
var mongoose = require('mongoose');
var app = express();
var bodyParser = require('body-parser');


mongoose.connect('mongodb://localhost:27017/myDB', function(error) {
	if (error) {
		console.log(error);
	} else {
		console.log('Connected to DB');
	}
});


app.use(
	bodyParser.urlencoded({
		extended: true
	})
);
app.use(bodyParser.json());
//app.use(express.static(__dirname + '/../www'));

app.use(function(req, res, next) {
	// Website you wish to allow to connect
	res.setHeader('Access-Control-Allow-Origin', '*');

	// Request methods you wish to allow
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

	// Request headers you wish to allow
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

	// Set to true if you need the website to include cookies in the requests sent
	// to the API (e.g. in case you use sessions)
	res.setHeader('Access-Control-Allow-Credentials', true);

	// Pass to next layer of middleware
	next();
});

app.listen(3000, function() {
	console.log('App listening on port 3000');
});


//Schemas
var authSchema = mongoose.Schema({
	account: String,
	password: String
});

var userSchema = mongoose.Schema({
	account: String,
	visits: [
		{
			id: mongoose.Schema.Types.ObjectId
		}
	]
});

var visitSchema = mongoose.Schema({
	rut: String,
	description: String,
	interviewerName: String,
	optionResultSelected: String,
	optionSaleSelected: String,
	writeComment: String,
	user: Object
});

//Models

var AuthUser = mongoose.model('AuthUser', authSchema, 'authUsers');
var User = mongoose.model('User', userSchema, 'users');
var Visit = mongoose.model('Visit', visitSchema, 'visits');

app.post('/api/users', function(req, res) {

	var user = new User();
	var authUser = new AuthUser();

	user.account = req.body.account;
	authUser.account = req.body.account;
	authUser.password = req.body.password;

	/*Verify if the user does not exist yet in the users*/
	AuthUser.findOne(
		{
			account: authUser.account
		},
		function(err, result) {
			if (err) {
				res.send(err);
				console.log(err);
				return;
			}
			if (result) {
				console.log(result);
				console.log('Yo have already an account');
				res.send('EXISTING USER');
				return;
			}
			/*Verify if the user does not exist yet in the user*/
			User.findOne(
				{
					account: authUser.account
				},
				function(err, u) {

					if (err) {
						res.send(err);
						return;
					}
					if (u) {
						u.account = user.account;
						console.log('Updating' + u);

						u.save(function(err) {
							if (err) {
								res.send(err);
							} else {
								console.log('Creating new auth user ...+++');
								authUser.save(function(err, result) {
									if (err) {
										res.send(err);
										console.log(err);
										return;
									}
									res.json(result);
								});
							}
						});
					} else {
						//If the user does not exist create the user and authUser
						console.log('Creating new user ...');
						/*create and save the user*/
						user.save(function(err) {
							if (err) {
								res.send(err);
								console.log(err);
								return;
							}
							console.log('Creating new auth user ...');
							authUser.save(function(err, result) {
								if (err) {
									res.send(err);
									console.log(err);
									return;
								}
								res.json(result);
							});
						});
					}
				}
			);
		}
	);
});

app.post('/api/visits', function(req, res) {
	console.log(req.body);

	var a = req.body;
	var user = a.user;
	//Check if the user who create te advert has already done it once or registred
	User.findOne({ account: user.user }, function(err, u) {
		if (err) {
			res.send(err);
			return;
		} else if (u) {
			//If the user exists in DB we use his _id to create the advert
			a.user._id = u._id;
		} else {
			// If not we create that user and use his _id to create the advert
			var userD = new User(user);
			console.log(userD);
			userD.save(function(err, response) {
				if (err) res.send(err);
			});
			if (err) return;

			a.user._id = userD._id; //Use that new user _id to create advert
		}

		var visit = new Visit(a); //Create the advert
		visit.save(function(err, response) {
			//Save it
			if (err) res.send(err);
			else {
				//update the advert's array in the user document
				User.update({ _id: a.user._id }, { $push: { visits: { _id: visit._id } } }, function(err, response) {
					if (err) {
						res.send(err);
					}
					console.log('ALL OK ', response);
					res.json('SUCCESS');
				});
			}
		});
	});
});

