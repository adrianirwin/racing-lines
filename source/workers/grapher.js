//	Libraries
import * as _ from 'lodash';
import * as graphs from '../graphs';

self.addEventListener('message', (event) => {
	const command = _.get(event, 'data.command', '');
	switch (command) {
		case 'start':
			self.graph(
				_.get(event, 'data.data', []),
				_.get(event, 'data.floor_path', ''),
				_.get(event, 'data.value_path', ''),
				_.get(event, 'data.scale', 1.0),
				_.get(event, 'data.offset_vector_coords', { 'x': 0, 'y': 0, 'z': 1 }),
				_.get(event, 'data.value_function', graphs.offset_line)
			);
			break;
	}
});

self.graph = function(data, floor_path, value_path, scale, offset_vector_coords, value_function) {
	self.console.log('grapher.graph');

	if (_.isString(value_function) === true) {
		value_function = graphs[value_function];
	}

	//	Process the points
	for (let index = 0, length = data.length; index < length;) {
		self.postMessage({
			'command': 'point',
			'points': value_function(
				_.map(data, floor_path),
				_.map(data, value_path),
				index,
				scale,
				offset_vector_coords
			),
			'index': index,
			'length': length
		});
		index++;
	}

	self.postMessage({ 'command': 'terminate' });
}