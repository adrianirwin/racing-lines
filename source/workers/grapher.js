//	Libraries
import * as _ from 'lodash';
import * as THREE from 'three';

self.addEventListener('message', (event) => {
	const command = _.get(event, 'data.command', '');
	switch (command) {
		case 'start':
			self.graph(_.get(event, 'data.data', []), _.get(event, 'data.floor_path', ''), _.get(event, 'data.value_path', ''), _.get(event, 'data.scale', 1.0), _.get(event, 'data.up_vector', new THREE.Vector3(0, 0, 1)));
			break;
	}
});

self.graph = function(data, floor_path, value_path, scale = 1.0, up_vector) {
	self.console.log('grapher.graph');

	//	Iterate on each point in the racing line
	const graph_value = function (floor_point, value, scale, up_vector) {

		//	TODO: Handle vectors other than straight up
		//	Take a function as an argument?

		const floor_vec = new THREE.Vector3(floor_point.x, floor_point.y, floor_point.z);
		up_vector.multiplyScalar((value * scale));
		floor_vec.add(up_vector);

		return { 'x': floor_vec.x, 'y': floor_vec.y, 'z': floor_vec.z };
	}

	for (let index = 0, length = data.length; index < length;) {
		self.postMessage({
			'command': 'point',
			'point': graph_value(
				_.get(data, '[' + index + '].' + floor_path, { 'x': 0, 'y': 0, 'z': 0 }),
				_.toNumber(_.get(data, '[' + index + '].' + value_path, 1.0)),
				scale,
				new THREE.Vector3(up_vector.x, up_vector.y, up_vector.z).normalize()
			),
			'index': index,
			'length': length
		});
		index++;
	}

	self.postMessage({ 'command': 'terminate' });
}