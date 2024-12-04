import * as THREE from 'three'
import get from 'lodash/get'
import isUndefined from 'lodash/isUndefined'
import last from 'lodash/last'
import nth from 'lodash/nth'
import { Coordinate } from './../models/Geometry'
import { RacingLinePoint } from './../models/Logs'
import { WebWorker } from './../models/Workers'

self.addEventListener('message', (event: MessageEvent): void => {
	const message: {
		command: string,
		bounds: Array<number>,
		index: number,
		points: Array<RacingLinePoint>,
		weights: Array<number>,
		start_offset: number,
		steps: number,
	} = JSON.parse(event.data)

	switch (message.command) {
		case  WebWorker.Task.SmoothPointsFinished:
			self.postMessage(JSON.stringify({
				command:			WebWorker.Task.Terminate,
			}))
			self.close()
			break

		case WebWorker.Task.SmoothPointsBatch:
			self.postMessage(JSON.stringify({
				command:		WebWorker.Task.PointsSmoothed,
				points:			smooth_by_averages(
									message.points,
									// cloned_points,
									message.bounds,
									message.weights,
									message.start_offset,
									message.steps,
								),
				index:			message.index,
			}))
			break
	}
})

function smooth_by_averages(
	points: Array<RacingLinePoint>,
	bounds: Array<number>,
	weights: Array<number>,
	start_offset: number,
	steps: number,
): Array<Coordinate.Cartesian3D> {
	const smoothed_points = new Array<Coordinate.Cartesian3D>()

	for (let count = start_offset; (count - start_offset) < steps && isUndefined(points[count]) === false; count++) {
		const averaged_points = new Array<THREE.Vector3>()

		//	Find the point that is the average position of the points
		//	within the bounding limit around the point in question
		bounds.forEach(function (max_bound, bound_i) {

			//	TODO: Bounds should stretch at low rates of speed
			//	There's an implicit assumption about the distance
			//	between GPS points and the bounding counts that is
			//	not well understood at the moment.
			const bound = Math.min(max_bound, count, (points.length - count))
			const average_point = new THREE.Vector3(0, 0, 0)

			if (bound > 0) {
				const points_to_average = points.slice(Math.max((count - bound), 0), (count + bound))

				points_to_average.forEach(function (point_to_average) {
					average_point.x += get(point_to_average, 'coordinates.cartesian.raw.x')
					average_point.y += get(point_to_average, 'coordinates.cartesian.raw.y')
					average_point.z += get(point_to_average, 'coordinates.cartesian.raw.z')
				})

				average_point.x = (average_point.x / points_to_average.length)
				average_point.y = (average_point.y / points_to_average.length)
				average_point.z = (average_point.z / points_to_average.length)
			} else {
				average_point.x = get(points, '[' + count + '].coordinates.cartesian.raw.x')
				average_point.y = get(points, '[' + count + '].coordinates.cartesian.raw.y')
				average_point.z = get(points, '[' + count + '].coordinates.cartesian.raw.z')
			}
			averaged_points.push(average_point)
		})

		//	Parse both the unit vectors and distances leading from the
		//	average point with the largest bounds, to the smallest
		const most_averaged_point = averaged_points[0].clone()
		const vectors_to_averaged_points = new Array<THREE.Vector3>()
		const vectors_between_averaged_points = new Array<THREE.Vector3>()
		const distances_between_averaged_points = new Array<number>()

		for (let i = 1, l = averaged_points.length; i < l; i++) {
			vectors_to_averaged_points.push(averaged_points[i].clone().sub(most_averaged_point))

			const vector_between_averaged_points = averaged_points[i].clone().sub(averaged_points[(i - 1)])
			distances_between_averaged_points.push(vector_between_averaged_points.length())
			vectors_between_averaged_points.push(vector_between_averaged_points.clone().normalize())
		}

		//	Work out the distance from the averaged point with the
		//	smallest bounds to the implied 'smoothed' point, then add
		//	all of the distances together
		let distance_rate_of_change_to_average = 0
		for (let i = 1, l = distances_between_averaged_points.length; i < l; i++) {
			if (distances_between_averaged_points[(i - 1)] > distances_between_averaged_points[i]) {
				distance_rate_of_change_to_average += ((distances_between_averaged_points[i] / distances_between_averaged_points[(i - 1)]) * weights[(i - 1)])
			} else {
				distance_rate_of_change_to_average += (1 * weights[(i - 1)])
			}
		}

		const last_distances_between_averaged_points = last(distances_between_averaged_points) || 0
		const last_vectors_between_averaged_points = last(vectors_between_averaged_points) || new THREE.Vector3(0, 0, 0)
		const nth_vectors_between_averaged_points = nth(vectors_between_averaged_points, -2) || new THREE.Vector3(0, 0, 0)

		const distance_to_smoothed_point = distance_rate_of_change_to_average * last_distances_between_averaged_points

		//	Work out the final vector to the implied 'smoothed' point
		const final_vector: THREE.Vector3 = last_vectors_between_averaged_points.clone().normalize()

		const rotation_axis_vector = new THREE.Vector3(0, 0, 0)
			.crossVectors(
				nth_vectors_between_averaged_points,
				last_vectors_between_averaged_points,
			)

		//	Use the preceding angle between the smoothed points to
		//	predict the final angle
		//	TODO: This is wrapping around in some places, needs work
		// let angle_budget = (Math.PI / 2)
		// const angle = nth(vectors_between_averaged_points, -2).angleTo(last(vectors_between_averaged_points))
		// if (_.isNaN(angle) === false) {
		// 	angle_budget = Math.max((angle_budget - angle), 0)
		// 	final_vector.applyAxisAngle(rotation_axis_vector, angle_budget).normalize()
		// }

		//	Add the scaled vector to the most averaged point (largest
		//	boundary) and the least averaged point to calculate where
		//	the new implied 'smoothed' point is located in absolute
		//	terms.
		const last_vectors_to_averaged_points = last(vectors_to_averaged_points) || new THREE.Vector3(0, 0, 0)

		final_vector
			.multiplyScalar(distance_to_smoothed_point)
			.add(last_vectors_to_averaged_points)
			.add(most_averaged_point)

		//	Update the input data set
		smoothed_points.push({ x: final_vector.x, y: final_vector.y, z: final_vector.z })
	}

	return smoothed_points
}
