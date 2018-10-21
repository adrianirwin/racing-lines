//	Libraries
import * as _ from 'lodash';
import * as THREE from 'three';

//	Simple line graph, scaled directly along the Z-axis
function vertical_line(floor_points, values, index, scale, up_coords) {
	const up_vector = new THREE.Vector3(up_coords.x, up_coords.y, up_coords.z).normalize();
	const floor_vec = new THREE.Vector3(floor_points[index].x, floor_points[index].y, floor_points[index].z);
	up_vector.multiplyScalar((values[index] * scale));
	floor_vec.add(up_vector);

	return { 'x': floor_vec.x, 'y': floor_vec.y, 'z': floor_vec.z };
}

export { vertical_line };