import assign from 'lodash/assign'
import isUndefined from 'lodash/isUndefined'
import * as THREE from 'three'

//	Simple line graph, renders the points as provided
export function line(floor_points: any, values: any, deltas: any, index: any, scale: any, steps: any, offset_vector_coords: any): Array<{ x: number, y: number, z: number }> {
	const points = new Array<{ x: number, y: number, z: number }>()

	for (let count = 0; count < steps && isUndefined(floor_points[(index + count)]) === false; count++) {
		const point_vec = new THREE.Vector3(floor_points[(index + count)].x, floor_points[(index + count)].y, floor_points[(index + count)].z)
		points[count] = {
			x: point_vec.x,
			y: point_vec.y,
			z: point_vec.z,
		}
	}

	return points
}

//	Line graph, scaled along the offset (typically Z) axis
export function offset_line(floor_points: any, values: any, deltas: any, index: any, scale: any, steps: any, offset_vector_coords: any): { values: Array<{ x: number, y: number, z: number }> } {
	const points = { values: new Array<{ x: number, y: number, z: number }>() }

	for (let count = 0; count < steps && isUndefined(floor_points[(index + count)]) === false; count++) {
		const offset_vector = new THREE.Vector3(offset_vector_coords.x, offset_vector_coords.y, offset_vector_coords.z).normalize()
		const point_vec = new THREE.Vector3(floor_points[(index + count)].x, floor_points[(index + count)].y, floor_points[(index + count)].z)

		offset_vector.multiplyScalar((values[(index + count)] * scale))
		point_vec.add(offset_vector)

		points.values[count] = {
			x: point_vec.x,
			y: point_vec.y,
			z: point_vec.z,
		}
	}

	return points
}

//	Filled line graph with previous point, scaled directly along the Z-axis
export function offset_fill(floor_points: any, values: any, deltas: any, index: any, scale: any, steps: any, offset_vector_coords: any): any {
	const points = { floors: new Array<{ x: number, y: number, z: number }>() }

	for (let count = 0; count < steps && isUndefined(floor_points[(index + count)]) === false; count++) {
		points.floors[count] = {
			x: floor_points[(index + count)].x,
			y: floor_points[(index + count)].y,
			z: floor_points[(index + count)].z,
		}
	}

	return assign({},
		offset_line(floor_points, values, deltas, index, scale, steps, offset_vector_coords),
		points
	)
}

//	
export function delta_fill(floor_points: any, values: any, deltas: any, index: any, scale: any, steps: any, offset_vector_coords: any): any {
	const points = { deltas: new Array<number>() }

	for (let count = 0; count < steps && isUndefined(deltas[(index + count)]) === false; count++) {
		points.deltas[count] = deltas[(index + count)]
	}

	return assign({},
		offset_fill(floor_points, values, deltas, index, scale, steps, offset_vector_coords),
		points
	)
}
