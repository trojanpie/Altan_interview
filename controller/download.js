const db = require("../models")
const Schema = db.schema;
const exporting = 0;
const terminated = -1;
const paused = 1;
const download_ready = 2;
var state = terminated;
const BLOCK_LIMIT = 1000;
const filename = 'out.csv';
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
var data_to_write = [];
const sleep = ms => { return new Promise(resolve => setTimeout(resolve, ms)) }
const encoding = { 'Done': 200, 'Failed': 500}
var next_data;
var completed_rows = 0;
var total_rows = 0;

const percentage = (total_rows,completed_rows)=>{
	if(total_rows === 0){ return 0; }
	else{
		var return_value = (completed_rows * 100)/(total_rows);
		return return_value;
	}
}

const remove_file = (filename)=>{
	try{
		fs.unlinkSync(filename);
		return (200);
	}catch(err){ return (500); }
}

const search_parameter = (constraints)=>{
	// This function can be used to specify the constraints for downloading Process
	return constraints;
}

const download_process = async (file_name,search_list)=>{
	try{	
		const Upload = db.upload;
		const headers = require('../headers/upload_schema.js');
		const csvWriter = createCsvWriter({
			path: file_name,
			header : headers
		});
		state = exporting;
		completed_rows = 0;
		// We can add the constraint as well that will be passed as parameter to the find 
		// Here we are trying export all the data that is present in the uploads collection
		const cursor = await Upload.find(search_list)
		.lean()	
		.map((doc)=>{
			final_data = {};
			headers.forEach((value)=>{
				final_data[value.id]=doc[value.id];
			})
			return final_data;
		})
		.cursor();

		total_rows = await Upload.find(search_list).count();
		console.log(total_rows);

		while (state !== exporting){ await sleep(100); }
		var cnt=0
		while(1){
			
			const next_data = await cursor.next()
			if(next_data !== null){
				data_to_write.push(next_data);
				completed_rows += 1;
				if(data_to_write.length === BLOCK_LIMIT){
					csvWriter.writeRecords(data_to_write);
					data_to_write = [];
				}
				while(1){
					//console.log('Paused',state);
					if(state === terminated){ 
						cursor.close();
						return [encoding['Failed'],'Terminated'];
					}

					if(state === exporting){ break; }
					await sleep(100);
				}
			}
			else{
				//console.log('Exhausted');
				if(data_to_write.length !== 0){
					await csvWriter.writeRecords(data_to_write);
					data_to_write = [];
					return encoding['Done'];
				}
				else{ return encoding['Done'];}
			}
		}
	}catch(err){
		console.log(err);
		return [encoding['Failed'],err];
	}
}

exports.download = async (req,res)=>{
	if(state === exporting){ res.send('Data already exporting'); }
	else if(state === paused){ res.send('Data exporting Paused'); }
	else{  
		console.log(req.body);
		res.json({message:"Downloading Process Started",output:"/download/file"});
		console.log(req.body);
		const search_list = await search_parameter(req.body);
		const process = await download_process(filename,search_list);	
		if(process === encoding['Done']){
			state = download_ready; 
		}
		else{ 
			await remove_file(filename);
			state = terminated; 
		}
	}
};

exports.file = (req,res)=>{
	if(state === download_ready){
		res.download(filename,(err)=>{
			if(err){
				res.status(500).send('Downloading Failed');
				state = terminated;
			}
			state = terminated; 
		})
	}
	else{ res.json({message:'No Output File Prepared for Downloading',status:state})}
}

exports.pause = (req,res)=>{
	if( state === terminated){ res.json({message:' You have to make a request to download',status:state}); }
	else if(state === paused){ res.json({message:' Downloading is Paused',status:state}); }
	else if(state === download_ready){ res.json({message:'The Download is Ready for download',status:state}); }
	else{ state = paused;  res.json({message:'Download Process Paused',status:state}); }
};

exports.resume = (req,res)=>{
	if( state === terminated){ res.json({message:' You have to make a request to download',status:state}); }
	else if(state === paused){ state = exporting; res.json({message:' Downloading Resumed',status:state}); }
	else if(state === download_ready){ res.json({message:'The Download is Ready for download',status:state}); }
	else{ res.json({message:'Download in Running',status:state}); }
};

exports.terminate = async (req,res)=>{
	if( state === terminated){ res.json({message:'No Running Process to Terminate',status:state}); }
	else if(state === exporting){ 
		state = terminated; 
		res.json({message:'Downloading Terminated',status:state}); 
	}
	else if(state === download_ready){ 
		state = terminated;
		await remove_file(filename);
		res.json({message:'The Download is Ready for download',status:state}); 
	}
	else{ 
		state = terminated;
		res.json({message:'Downloading Terminated',status:state});
	}
};

exports.status = (req,res)=>{
	var completed = percentage(total_rows,completed_rows);
	if(state === terminated){ res.json({message:'No downloading Process',done: 0})}
	else if(state === exporting){ res.json({message:'Running a download Process',done: completed})}
	else if(state === paused){ res.json({message:'Download Process is stopped',done: completed}); }
	else{ res.json({message:'File Ready to be installed, Please go to /download/file', done: 100})}
}