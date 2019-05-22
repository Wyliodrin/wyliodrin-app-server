const lcd = require('./lcdlib');
const _ = require('lodash');
const async = require ('async');

let array = [];
let index = 0;
let delay = 300;


function doesIdExist(id) {

	let ans = _.findIndex(array, function(obj) {
		return (obj.id === id);
	});
	if (ans === -1) {
		return false;
	} else {
		return true;
	}
}

function findObjectById (id)
{
	let object = null;
	let i = _.findIndex (array, function (o)
	{
		if (o.id === id) return true;
		else return false;
	});
	if (i>=0) 
	{
		array[i].index = i;
		object = array[i];
	}
	return object;
}

function writeObjectOnLcd(index, callback) {

	async.series ([
		function (callback) { lcd.init().then(callback); },
		function (callback) { lcd.clear(); callback (); },
		function (callback) { lcd.write(array[index].line1, 0, 0).then (callback); },
		function (callback) { lcd.write(array[index].line2, 0, 1).then (callback); }
	], callback);
}

function replace (object)
{
	if (!_.isUndefined (object))
	{
		let arrayObject = findObjectById (object.id);
		if (arrayObject)
		{
			if (arrayObject.line1 !== object.line1 || arrayObject.line2 !== object.line2)
			{
				arrayObject.line1 = object.line1;
				arrayObject.line2 = object.line2;
				if (arrayObject.index === index)
				{
					displayCurrent ();
				}
			}
			else
			{
				// console.log ('Object is the same');
			}
		}
		else
		{
			array.push (object);
			if (array.length === 1) displayCurrent ();
		}
	}
	else
	{
		// console.log ('Object has not id');
	}
}

function pop() {
	return array.pop();
}

function push(object) {

	let index = array.length;
	if (_.isUndefined(object.id)) {
		let i = 0;
		while (_.isUndefined(object.id)) {

			if (doesIdExist(i)) {
				i++;
			} else {
				object.id = i;
			}
		}

	}

	if (_.isUndefined(object.line1)) {
		object.line1 = '';
	}

	if (_.isUndefined(object.line2)) {
		object.line2 = '';
	}

	array.splice(index, 0, object);
	return object;
}

function removeByIndex(index) {
	array.splice(index, 1);
}

function removeById(id) {


	let indexToRemove = 0;
	do {
		indexToRemove = _.findIndex(array, function(obj) {
			return (obj.id === id);
		}, indexToRemove);

		_.pullAt(array, indexToRemove);

	} while (indexToRemove !== -1);

}

function displayNext() {
	setTimeout(function() {
		if (index === array.length - 1) {
			writeObjectOnLcd(index = 0);
		} else {
			writeObjectOnLcd(++index);
		}
	}, delay);

}

function displayCurrent() {
	setTimeout(function() {
		writeObjectOnLcd(index);
	}, delay);
}

function displayPrevious() {
	setTimeout(function() {
		if (index === 0) {
			writeObjectOnLcd(index = array.length - 1);
		} else {
			writeObjectOnLcd(--index);
		}
	}, delay);

}

function displayOnce(obj) {
	setTimeout(function() {
		async.series ([
			function (callback) { lcd.init().then (callback); },
			function (callback) { lcd.clear(); callback (); },
			function (callback) { lcd.write(obj.line1, 0, 0).then (callback); },
			function (callback) { lcd.write(obj.line2, 0, 1).then (callback); }
		]);
	}, delay);
}

module.exports = {
	removeById: removeById,
	removeByIndex: removeByIndex,
	push: push,
	pop: pop,
	replace: replace,
	displayOnce: displayOnce,
	displayPrevious: displayPrevious,
	displayNext: displayNext,
	displayCurrent: displayCurrent

};