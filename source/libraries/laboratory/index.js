

const lcd = require('./printFunctions');
const board = require('./gpiolib');
const ip = require ('ip');

var project = require ('../project');
var treeProject = require ('../treeProject');
var uplink = require ('../uplink');

let ranProject = runningProject ();

function run () {
	// await info.updateInfo();
	let obj1 = {
		id: 1,
		line1: 'Device IP',
		line2: ip.address ()
	};
	// let obj2 = {
	// 	id: 2,
	// 	line1: 'Device ID',
	// 	line2: info.information.boardId
	// };
	if (!runningProject ())
	{
		lcd.replace(obj1);
		if (uplink.inUse ())
		{
			board.ledRed.writeSync(0);
			board.ledGreen.writeSync(1);
		}
		else
		{
			board.ledRed.writeSync(1);
			board.ledGreen.writeSync(0);
		}
	}
	else if (ranProject === false)
	{
		board.ledRed.writeSync(0);
		board.ledGreen.writeSync(0);
	}
	// lcd.replace(obj2);
	setTimeout (run, 3000);
}

function runningProject ()
{
	return project.getProjectPid() !== 0 || treeProject.getProjectPid () !== 0;
}

run ();

//stanga
board.button2.watch(function(err, value) {
	if (!runningProject())
	{
		// board.ledGreen.writeSync(value);
		if (value) {
			lcd.displayPrevious();
		}
	}
});



//dreapta
board.button1.watch(function(err, value) {
	if (!runningProject())
	{
		// board.ledRed.writeSync(value);
		if (value) {
			lcd.displayNext();
		}
	}
});