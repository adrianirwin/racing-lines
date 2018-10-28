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

	const parsed = Papa.parse(csv, { 'delimiter': ',', 'dynamicTyping': true, 'header': false });

	let loop_index = 0;
	const loop_size = 1000;
	const loop_limit = parsed.data.length;

	const interval_id = self.setInterval((context) => {
		if ((loop_index * loop_size) < loop_limit) {
			self.postMessage(JSON.stringify({
				'command': 'data',
				'data': parsed.data.slice((loop_index * loop_size), ((loop_index + 1) * loop_size))
			}));
			loop_index++;
		} else {
			self.clearInterval(interval_id);
			self.postMessage(JSON.stringify({ 'command': 'terminate' }));
		}
	}, 1, self);
}