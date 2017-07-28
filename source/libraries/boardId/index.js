console.log ('index');
var spawn = require('child_process').spawnSync;
console.log (__dirname);
var process = spawn('python',[__dirname+'/boardId.py']);
var id = process.stdout.toString();
module.exports.id = id;