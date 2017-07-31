var spawn = require('child_process').spawnSync;
var process = spawn('python',[__dirname+'/boardId.py']);
var id = process.stdout.toString();
console.log ('id is ' +id);
module.exports = id;