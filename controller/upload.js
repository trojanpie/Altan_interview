const db = require("../models")
const Schema = db.schema;
const filename = "./pap.csv";
const CSVToJSON = require("csvtojson");
const LineByLineReader = require("line-by-line");
const fs = require("fs");
const { EOL } = require("os");
const BLOCK_LIMIT = 1000;
let lines = [];
const terminated = -1;
const uploading = 0;
const paused = 1;
var state = terminated;
const sleep = ms => { return new Promise(resolve => setTimeout(resolve, ms)) }
const coding = { 'Done':500,'Aborted':200,'Not_started':100,'In_Process':300};
var status = coding['Not_started'];
var content,total_rows=0,completed_rows=0;

const process_file = ()=>{
	//console.log(content,typeof(content));
	lines_temp = content.split("\r");
	rowCount = lines_temp.length; 
	return rowCount;
}


readFileAsync = (filename)=>{
    return new Promise(function(resolve, reject) {
        fs.readFile(filename,'utf-8', async (err, data)=>{
            if (err){ reject(err); }
            else{
                content = data;
                try{ const required = await process_file();
                	//console.log(required);
            		resolve(required);
            	}catch(err){  reject(err); }
            }
        });
    });
};

const percentage = (total_row,completed_row)=>{
	if(total_row === 0){ return 0; }
	let x = (completed_row*100)/(total_row);
	return x;
}

const upload_process = async (file_name)=>{
	try{
		total_rows = await readFileAsync(file_name);
		completed_rows = 0;
		const session = await db.mongoose.startSession();
		state = uploading;
		const Upload = db.upload;
		const lr = new LineByLineReader(file_name);
		await session.startTransaction();
		
		while(state !== uploading){ await sleep(100); }
		
		lr.on("line", (line) => {
    		lines.push(line);
	    	completed_rows++;
	    	
	    	if(lines.length === BLOCK_LIMIT) {
	        lr.pause();
	        lines.splice(0, 0, ["name","gender","age","city","mobile"]);

	        const csvBlockString = lines.join(EOL);
	        const entries = [];

	        lines = [];      
	        CSVToJSON()
				.fromString(csvBlockString)
				.then(async (jsonObj)=>{
					try{
						await Upload.insertMany(jsonObj,{session});
						//console.log('inserted',state);
						while(1){
							//console.log('Paused',state);
							if( state === terminated){
								await session.abortTransaction();
								session.endSession();
								lr.close();
								status = coding['Aborted'];
								break;
							}
							else if(state === uploading){ lr.resume(); break; }
							await sleep(100);
						}
					}catch(err){
						console.log(err);
						await session.abortTransaction();
						state = terminated;
						status = coding['Aborted'];
						lr.close();
					}

				})
				.catch((err)=>{console.log(err);})
			}
		})
		.on("end",async () => {
	    	await session.commitTransaction();
	    	state = terminated;
	    	session.endSession();
	    	status = coding['Done'];
		})
	}catch(err){ state = terminated; throw (err); }
}

exports.create = async (req,res)=>{
	//console.log(state);
	if(state===uploading){ res.send('The Uploading is In process');}
	else if(state===paused){ res.send('The Upload is Paused'); }
	else{
		while(status !== coding['Not_started']){ await sleep(100); }
		res.setHeader('Content-Type', 'text/html');
		status = coding['In_Process'];
		try{ 
			await upload_process(filename); 
			
			while(status === coding['In_Process']){ await sleep(100); }
			if(status === coding['Done']){ status = coding['Not_started']; res.status(200).send('Uploaded Succesfully'); }
			else{ status = coding['Not_started'];  res.status(500).send('Failure in Uploading'); }
		}
		catch(err){ status = coding['Not_started']; state = res.status(500).send('Problem Occured in Loading');  }
	}		
}

exports.pause = (req,res)=>{
	if(state===uploading){ state=paused;  res.send('Pause Uploaded in the database'); }
	else if(state===paused){ res.send('Process already paused'); }
	else{ res.send('No running Process'); }
};

exports.terminate = async (req,res)=>{
	if(state===paused){ state=terminated;  res.send('Terminated Process');  }
	else{ res.send('No Paused Process'); }
};

exports.resume = async (req,res)=>{
	if(state===paused){ state=uploading;  res.send('Resumed Process'); }
	else{ res.send('No Paused Process'); }
};

exports.status = async (req,res)=>{
	const completed = await percentage(total_rows,completed_rows);
	if(state === paused){ res.json({message:' Uploading Paused', done: completed}) }
	else if(state === terminated){ res.json({message: 'No Running Process', done: 0});}
	else{ res.json({message:' Process Running', done: completed })}
}