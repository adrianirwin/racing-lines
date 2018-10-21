//	Libraries
import * as _ from 'lodash';
import * as THREE from 'three';
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
				_.get(event, 'data.up_coords', { 'x': 0, 'y': 0, 'z': 1 }),
				_.get(event, 'data.value_function', function (floor_points, values, index, scale, up_coords) {

					//	Simple line graph, scaled directly along the Z-axis
					const up_vector = new THREE.Vector3(up_coords.x, up_coords.y, up_coords.z).normalize();
					const floor_vec = new THREE.Vector3(floor_points[index].x, floor_points[index].y, floor_points[index].z);
					up_vector.multiplyScalar((values[index] * scale));
					floor_vec.add(up_vector);

					return { 'x': floor_vec.x, 'y': floor_vec.y, 'z': floor_vec.z };
				})
			);
			break;
	}
});

self.graph = function(data, floor_path, value_path, scale, up_coords, value_function) {
	self.console.log('grapher.graph');

	if (_.isString(value_function) === true) {
		value_function = graphs[value_function];
	}

	//	Process the points
	for (let index = 0, length = data.length; index < length;) {
		self.postMessage({
			'command': 'point',
			'point': value_function(
				_.map(data, floor_path),
				_.map(data, value_path),
				index,
				scale,
				up_coords
			),
			'index': index,
			'length': length
		});
		index++;
	}

	self.postMessage({ 'command': 'terminate' });
}