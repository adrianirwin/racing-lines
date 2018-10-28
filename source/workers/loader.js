//	Libraries
import * as Papa from 'papaparse';

self.addEventListener('message', (event) => {

	const fileReader = new FileReader();

	fileReader.onload = function () {
		self.csv_to_object(self.atob(fileReader.result.split(',')[1]).replace(/"/g, ''));
	};
	fileReader.readAsDataURL(event.data[0]);
});

self.csv_to_object = function(csv) {
	self.console.log('loader.csv_to_object');

	self.postMessage(JSON.stringify({ 'command': 'data', 'data': Papa.parse(csv, { 'delimiter': ',', 'dynamicTyping': true, 'header': false }) }));
	self.postMessage(JSON.stringify({ 'command': 'terminate' }));
	return;
}