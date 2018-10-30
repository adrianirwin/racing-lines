//	Libraries
import * as _ from 'lodash';
import * as graphs from '../graphs';

self.points = [];

self.addEventListener('message', (event) => {
	const message = JSON.parse(_.get(event, 'data', {}));
	const command = _.get(message, 'command', '');

	switch (command) {
		case 'points':
			self.points = self.points.concat(_.get(message, 'points', []));
			break;
		case 'start':
			self.graph(
				self.points,
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

self.graph = function(points, floor_path, value_path, scale, steps, offset_vector_coords, value_function) {
	self.console.log('grapher.graph');

	if (_.isString(value_function) === true) {
		value_function = graphs[value_function];
	}

	//	Process the points
	for (let index = 0, length = points.length; index < length; index += steps) {
		self.postMessage(JSON.stringify({
			'command': 'point',
			'points': value_function(
				_.map(points, floor_path),
				_.map(points, value_path),
				index,
				scale,
				steps,
				offset_vector_coords
			),
			'index': index,
			'length': length
		}));
	}

	//	Clean up listeners in the main thread and the accumulated points
	self.points = [];
	self.postMessage(JSON.stringify({ 'command': 'terminate' }));
}