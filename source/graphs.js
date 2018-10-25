//	Libraries
import * as _ from 'lodash';
import * as THREE from 'three';

//	Simple line graph, renders the points as provided
function line(floor_points, values, index, scale, steps, offset_vector_coords) {
	const points = [];

	for (let count = 0; count < steps && _.isUndefined(floor_points[(index + count)]) === false; count++) {
		const point_vec = new THREE.Vector3(floor_points[(index + count)].x, floor_points[(index + count)].y, floor_points[(index + count)].z);
		_.set(points, '[' + count + ']', { 'x': point_vec.x, 'y': point_vec.y, 'z': point_vec.z });
	}

	return points;
}

//	Line graph, scaled along the offset (typically Z) axis
function offset_line(floor_points, values, index, scale, steps, offset_vector_coords) {
	const points = { 'values': [] };

	for (let count = 0; count < steps && _.isUndefined(floor_points[(index + count)]) === false; count++) {
		const offset_vector = new THREE.Vector3(offset_vector_coords.x, offset_vector_coords.y, offset_vector_coords.z).normalize();
		const point_vec = new THREE.Vector3(floor_points[(index + count)].x, floor_points[(index + count)].y, floor_points[(index + count)].z);

		offset_vector.multiplyScalar((values[(index + count)] * scale));
		point_vec.add(offset_vector);

		_.set(points, 'values[' + count + ']', { 'x': point_vec.x, 'y': point_vec.y, 'z': point_vec.z });
	}

	return points;
}

//	Filled line graph with previous point, scaled directly along the Z-axis
function offset_fill(floor_points, values, index, scale, steps, offset_vector_coords) {
	const points = { 'floors': [] };

	for (let count = 0; count < steps && _.isUndefined(floor_points[(index + count)]) === false; count++) {
		_.set(points, 'floors[' + count + ']', { 'x': floor_points[(index + count)].x, 'y': floor_points[(index + count)].y, 'z': floor_points[(index + count)].z });
	}

	return _.assign({},
		offset_line(floor_points, values, index, scale, steps, offset_vector_coords),
		points
	);
}

export { line, offset_line, offset_fill };