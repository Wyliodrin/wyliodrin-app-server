const BUTTON1 = 13;
const BUTTON2 = 19;
const LED_GREEN = 20;
const LED_RED = 21;
const Gpio = require('onoff').Gpio;
const ledGreen = new Gpio(LED_GREEN, 'out');
const ledRed = new Gpio(LED_RED, 'out');
const button1 = new Gpio(BUTTON1, 'in', 'both');
const button2 = new Gpio(BUTTON2, 'in', 'both');


module.exports = {
	button1: button1,
	button2: button2,
	ledRed: ledRed,
	ledGreen: ledGreen
};