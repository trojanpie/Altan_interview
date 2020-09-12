const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const fs = require('fs');

var corsOptions = { origin: "http://localhost:8081" };

app.use(cors(corsOptions));

// parse requests of content-type - application/json
app.use(bodyParser.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

const db = require("./models/index.js");
require("./routes/upload.js")(app);
require("./routes/download.js")(app);


async function initMongo(){
	console.log('Initialising MongoDb...');
	let success = false;
	while(!success){
		try{
			client = await db.mongoose.connect(
			db.url,{ useNewUrlParser: true,useUnifiedTopology: true})
			console.log('Database Connected');
			success = true;
		} catch {
			await new Promise(resolve => setTimeout(resolve,1000));
		}
	}
}



async function start(){
	await initMongo();
	//console.log(data)
	app.get("/",(req,res)=>{
		res.json({messgae: "Welcome to Altan Application"});
	})

	app.post("/",(req,res)=>{
		console.log(req.body);
	})

	const PORT = process.env.port || 8080;
	app.listen(PORT, () => {
  		console.log(`Server is running on port ${PORT}.`);
	});

}

start();
