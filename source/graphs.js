//	Libraries
import * as _ from 'lodash';
import * as THREE from 'three';

//	Simple line graph, scaled along the offset (typically Z) axis
function offset_line(floor_points, values, index, scale, offset_vector_coords) {
	const offset_vector = new THREE.Vector3(offset_vector_coords.x, offset_vector_coords.y, offset_vector_coords.z).normalize();
	const point_vec = new THREE.Vector3(floor_points[index].x, floor_points[index].y, floor_points[index].z);

	offset_vector.multiplyScalar((values[index] * scale));
	point_vec.add(offset_vector);

	return {
		'value': { 'x': point_vec.x, 'y': point_vec.y, 'z': point_vec.z }
	};
}

//	Simple filled line graph with previous point, scaled directly along the Z-axis
function offset_fill(floor_points, values, index, scale, offset_vector_coords) {
	return _.assign({},
		offset_line(floor_points, values, index, scale, offset_vector_coords),
		{
			'floor': { 'x': floor_points[index].x, 'y': floor_points[index].y, 'z': floor_points[index].z }
		}
	);
}

export { offset_line, offset_fill };