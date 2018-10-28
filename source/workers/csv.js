//	Libraries
import * as _ from 'lodash';
import * as Papa from 'papaparse';

self.addEventListener('message', (event) => {
	const message = JSON.parse(_.get(event, 'data', {}));
	const command = _.get(message, 'command', '');

	switch (command) {
		case 'start':
			self.from_csv(_.get(message, 'csv', []));
			break;
	}
});

self.from_csv = function(csv) {
	self.console.log('csv.from_csv');
	self.postMessage(JSON.stringify({ 'command': 'data', 'data': Papa.parse(csv, { 'delimiter': ',', 'dynamicTyping': true, 'header': false }) }));
	self.postMessage(JSON.stringify({ 'command': 'terminate' }));
	return;
}