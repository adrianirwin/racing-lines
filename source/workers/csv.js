//	Libraries
import * as _ from 'lodash';
import * as Papa from 'papaparse';

self.addEventListener('message', (event) => {
	const command = _.get(event, 'data.command', '');
	switch (command) {
		case 'start':
			self.from_csv(_.get(event, 'data.csv', []));
			break;
	}
});

self.from_csv = function(csv) {
	self.console.log('csv.from_csv');
	self.postMessage({ 'command': 'data', 'data': Papa.parse(csv, { 'delimiter': ',', 'dynamicTyping': true, 'header': false }) });
	self.postMessage({ 'command': 'terminate' });
	return;
}