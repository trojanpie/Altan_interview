var upload_schema = mongoose =>{
	
	var schema = mongoose.Schema({
	name: String,
	gender: String,
	age: Number,
	city: String,
	mobile: Number,
	created: {
		type: Date,
		default: Date.now
		}
	})
	var team = mongoose.model('Uploads',schema);
	return team;
}

module.exports = upload_schema