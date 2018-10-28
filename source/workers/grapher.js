//	Libraries
import * as _ from 'lodash';
import * as graphs from '../graphs';

self.addEventListener('message', (event) => {
	const message = JSON.parse(_.get(event, 'data', {}));
	const command = _.get(message, 'command', '');

	switch (command) {
		case 'start':
			self.graph(
				_.get(message, 'data', []),
				_.get(message, 'floor_path', ''),
				_.get(message, 'value_path', ''),
				_.get(message, 'scale', 1.0),
				_.get(message, 'steps', 1),
				_.get(message, 'offset_vector_coords', { 'x': 0, 'y': 0, 'z': 1 }),
				_.get(message, 'value_function', graphs.offset_line)
			);
			break;
	}
});

self.graph = function(data, floor_path, value_path, scale, steps, offset_vector_coords, value_function) {
	self.console.log('grapher.graph');

	if (_.isString(value_function) === true) {
		value_function = graphs[value_function];
	}

	//	Process the points
	for (let index = 0, length = data.length; index < length; index += steps) {
		self.postMessage(JSON.stringify({
			'command': 'point',
			'points': value_function(
				_.map(data, floor_path),
				_.map(data, value_path),
				index,
				scale,
				steps,
				offset_vector_coords
			),
			'index': index,
			'length': length
		}));
	}

	self.postMessage(JSON.stringify({ 'command': 'terminate' }));
}