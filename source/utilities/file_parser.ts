import * as AFRAME from 'aframe'
import get from 'lodash/get'
import isNaN from 'lodash/isNaN'
import isNull from 'lodash/isNull'
import isUndefined from 'lodash/isUndefined'
import last from 'lodash/last'
import nth from 'lodash/nth'
import set from 'lodash/set'
import * as Papa from 'papaparse'
import * as ecef from 'geodetic-to-ecef'
import * as devices from './../utilities/devices'
import { Coordinate } from './../models/Geometry'
import { RacingLinePoint } from './../models/Logs'

//	Parser settings
function from_csv(csv: string): any {
	window.console.log('parser.from_csv')

	return Papa.parse(csv, {
		delimiter: ',',
		dynamicTyping: true,
		header: false,
	})
}

//	Extract all data points that match the device profile
function racing_line_points(data: Array<any>, device_profile: { log_indicies: any }): Array<RacingLinePoint> {
	window.console.log('parser.racing_line_points')

	const racing_line_points = new Array<RacingLinePoint>()
	let latitude: number | null = null
	let longitude: number | null = null
	data.forEach(function (row, index) {
		//	TODO: Interpolation, or does smoothing already cover that??

		latitude = row[get(device_profile, 'log_indicies.gps.latitude')]
		longitude = row[get(device_profile, 'log_indicies.gps.longitude')]

		//	Skip header row and rows without GPS coords
		if (
			index > 0
			&& isNull(latitude) === false
			&& isNull(longitude) === false
		) {
			// TODO: Hack
			const temp: any = {}

			devices.log_to_point(temp, row, device_profile, 'g', ['x', 'y', 'z'])
			devices.log_to_point(temp, row, device_profile, 'rotation', ['yaw', 'pitch', 'roll'])
			devices.log_to_point(temp, row, device_profile, 'timing', ['interval', 'utc'])
			devices.log_to_point(temp, row, device_profile, 'performance', ['speed', 'current_lap'])
			devices.log_to_point(temp, row, device_profile, 'diagnostics', ['coolant_temperature', 'oil_temperature', 'oil_pressure', 'battery_voltage'])

			const racing_line_point: RacingLinePoint = {
				coordinates: {
					cartesian: {
						raw: { x: 0, y: 0, z: 0, },
						smoothed: { x: 0, y: 0, z: 0, },
					},
					gps: { latitude, longitude, },
				},
				delta: { speed: 0, },
				diagnostics: temp.diagnostics,
				g: temp.g,
				performance: temp.performance,
				rotation: temp.rotation,
				timing: temp.timing,
			}

			racing_line_points.push(racing_line_point)
		}
	})

	return racing_line_points
}

//	Isolate lat/long coordinates from the data
// TODO: Unused
// function gps(data, device_profile): any {
// 	window.console.log('parser.gps')

// 	const gps_coords = []
// 	data.forEach(function (row, index) {
// 		//	Skip header row and rows without GPS coords
// 		if (
// 			index > 0
// 			&& isNull(row[get(device_profile, 'log_indicies.gps.latitude')]) === false
// 			&& isNull(row[get(device_profile, 'log_indicies.gps.longitude')]) === false
// 		) {
// 			gps_coords.push({
// 				lat: row[get(device_profile, 'log_indicies.gps.latitude')],
// 				long: row[get(device_profile, 'log_indicies.gps.longitude')]
// 			})
// 		}
// 	})
// 	return gps_coords
// }

//	Identify lap boundaries from the data
// TODO: Unused
// function laps(data, device_profile): any {
// 	window.console.log('parser.laps')

// 	const lap_first_point_indexes = []
// 	let current_lap = null
// 	let gps_index = 0
// 	data.forEach(function (row, index) {
// 		//	Skip header row and rows without GPS coords
// 		if (
// 			index > 0
// 			&& isNull(get(row, 'coordinates.gps.latitude')) === false
// 			&& isNull(get(row, 'coordinates.gps.longitude')) === false
// 		) {
// 			if (current_lap !== get(row, 'performance.current_lap')) {
// 				current_lap = get(row, 'performance.current_lap')
// 				lap_first_point_indexes.push(gps_index)
// 			}
// 			gps_index++
// 		}
// 	})

// 	//	Remove the '0' boundary
// 	lap_first_point_indexes.splice(0, 1)

// 	return lap_first_point_indexes
// }

//	Determine the outer bounds of the data in lat/long
// TODO: Unused
// function bounds(data): any {
// 	window.console.log('parser.bounds')

// 	const bounds_coords = {
// 		'latitude_northmost': null,
// 		'latitude_southmost': null,
// 		'longitude_westmost': null,
// 		'longitude_eastmost': null
// 	}
// 	data.forEach(function (row, index) {
// 		const latitude = get(row, 'coordinates.gps.latitude')
// 		const longitude = get(row, 'coordinates.gps.longitude')

// 		if (isNull(bounds_coords.latitude_northmost) === true || latitude > bounds_coords.latitude_northmost) {
// 			bounds_coords.latitude_northmost = latitude
// 		}

// 		if (isNull(bounds_coords.latitude_southmost) === true || latitude < bounds_coords.latitude_southmost) {
// 			bounds_coords.latitude_southmost = latitude
// 		}

// 		if (isNull(bounds_coords.longitude_westmost) === true || longitude > bounds_coords.longitude_westmost) {
// 			bounds_coords.longitude_westmost = longitude
// 		}

// 		if (isNull(bounds_coords.longitude_eastmost) === true || longitude < bounds_coords.longitude_eastmost) {
// 			bounds_coords.longitude_eastmost = longitude
// 		}
// 	})
// 	return bounds_coords
// }

//	Convert lat/long to cartesian (x, y, z) coordinates
// TODO: Unused
// function cartesian(data): any {
// 	window.console.log('parser.cartesian')

// 	data.forEach(function (point, index) {
// 		const cartesian_point = ecef(get(point, 'coordinates.gps.latitude'), get(point, 'coordinates.gps.longitude'))
// 		if (
// 			isNaN(cartesian_point[0]) === false
// 			&& isNaN(cartesian_point[1]) === false
// 			&& isNaN(cartesian_point[2]) === false
// 		) {
// 			set(data, '[' + index + '].coordinates.cartesian.raw', {
// 				'x': cartesian_point[0],
// 				'y': cartesian_point[1],
// 				'z': cartesian_point[2]
// 			})
// 		}
// 	})
// }

//	Shift the data by the provided amount
// TODO: Unused
// function recenter(data, x, y, z): any {
// 	window.console.log('parser.recenter')

// 	data.forEach(function (point, index) {
// 		set(data, '[' + index + '].coordinates.cartesian.raw', {
// 			'x': (get(point, 'coordinates.cartesian.raw.x') - x),
// 			'y': (get(point, 'coordinates.cartesian.raw.y') - y),
// 			'z': (get(point, 'coordinates.cartesian.raw.z') - z)
// 		})
// 	})
// }

//	Smooth the data
function smooth(data: any, bounds: any, weights: any, points = false, interval = 50, listener: EventTarget | null = null, event_name: string | null = null): void {
	window.console.log('parser.smooth')

	// const smoothed_points_by_bounds = []
	// if (points === true) {
	// 	bounds.forEach(function () {
	// 		smoothed_points_by_bounds.push([])
	// 	})
	// 	smoothed_points_by_bounds.push([])
	// }

	//	Iterate on each point in the racing line
	// data.forEach(function (point, index) {
	const smooth_by_averages = function (data: Array<RacingLinePoint>, point: RacingLinePoint, index: number, length: number, listener: EventTarget | null, event_name: string | null): Coordinate.Cartesian3D {
		const averaged_points = new Array<AFRAME.THREE.Vector3>()

		//	Find the point that is the average position of the points
		//	within the bounding limit around the point in question
		bounds.forEach(function (max_bound: number, bound_i: number) {

			//	TODO: Bounds should stretch at low rates of speed
			//	There's an implicit assumption about the distance
			//	between GPS points and the bounding counts that is
			//	not well understood at the moment.
			const bound = Math.min(max_bound, index, (data.length - index))
			const average_point = new AFRAME.THREE.Vector3(0, 0, 0)

			if (bound > 0) {
				const points_to_average = data.slice((index - bound), (index + bound))

				points_to_average.forEach(function (point_to_average) {
					average_point.x += get(point_to_average, 'coordinates.cartesian.raw.x')
					average_point.y += get(point_to_average, 'coordinates.cartesian.raw.y')
					average_point.z += get(point_to_average, 'coordinates.cartesian.raw.z')
				})

				average_point.x = (average_point.x / points_to_average.length)
				average_point.y = (average_point.y / points_to_average.length)
				average_point.z = (average_point.z / points_to_average.length)
			} else {
				average_point.x = get(point, 'coordinates.cartesian.raw.x')
				average_point.y = get(point, 'coordinates.cartesian.raw.y')
				average_point.z = get(point, 'coordinates.cartesian.raw.z')
			}
			averaged_points.push(average_point)

			// if (points === true) {
			// 	smoothed_points_by_bounds[bound_i].push(average_point)
			// }
		})

		//	Convert to Vector3 to use some of the built-in methods
		averaged_points.forEach(function (averaged_point, averaged_point_i) {
			averaged_points[averaged_point_i] = new AFRAME.THREE.Vector3(averaged_point.x, averaged_point.y, averaged_point.z)
		})

		//	Parse both the unit vectors and distances leading from the
		//	average point with the largest bounds, to the smallest
		const most_averaged_point = averaged_points[0].clone()
		const vectors_to_averaged_points = new Array<AFRAME.THREE.Vector3>()
		const vectors_between_averaged_points = new Array<AFRAME.THREE.Vector3>()
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

		const smoothed_point: Coordinate.Cartesian3D = { x: 0, y: 0, z: 0, }

		if (vectors_between_averaged_points.length > 0 && distances_between_averaged_points.length > 0) {

			// const distance_to_smoothed_point: number = (distance_rate_of_change_to_average * last(distances_between_averaged_points))
			const distances_between_averaged_points_last: number = (distances_between_averaged_points[distances_between_averaged_points.length - 1]) || 0
			const distance_to_smoothed_point: number = (distance_rate_of_change_to_average * distances_between_averaged_points_last)

			//	Work out the final vector to the implied 'smoothed' point
			const vectors_between_averaged_points_last: AFRAME.THREE.Vector3 = (vectors_between_averaged_points[vectors_between_averaged_points.length - 1]) || new AFRAME.THREE.Vector3(0, 0, 0)
			const vectors_between_averaged_points_second_to_last: AFRAME.THREE.Vector3 = (vectors_between_averaged_points[vectors_between_averaged_points.length - 2]) || new AFRAME.THREE.Vector3(0, 0, 0)
			const final_vector: AFRAME.THREE.Vector3 = vectors_between_averaged_points_last.clone().normalize()

			const rotation_axis_vector = new AFRAME.THREE.Vector3(0, 0, 0)
				.crossVectors(
					// nth(vectors_between_averaged_points, -2),
					vectors_between_averaged_points_second_to_last,
					vectors_between_averaged_points_last,
				)

			//	Use the preceding angle between the smoothed points to
			//	predict the final angle
			//	TODO: This is wrapping around in some places, needs work
			// let angle_budget = (Math.PI / 2)
			// const angle = nth(vectors_between_averaged_points, -2).angleTo(last(vectors_between_averaged_points))
			// if (isNaN(angle) === false) {
			// 	angle_budget = Math.max((angle_budget - angle), 0)
			// 	final_vector.applyAxisAngle(rotation_axis_vector, angle_budget).normalize()
			// }

			//	Add the scaled vector to the most averaged point (largest
			//	boundary) and the least averaged point to calculate where
			//	the new implied 'smoothed' point is located in absolute
			//	terms.
			const vectors_to_averaged_points_last: AFRAME.THREE.Vector3 = (vectors_to_averaged_points[vectors_to_averaged_points.length - 1]) || new AFRAME.THREE.Vector3(0, 0, 0)
			final_vector
				.multiplyScalar(distance_to_smoothed_point)
				.add(vectors_to_averaged_points_last)
				.add(most_averaged_point)

			smoothed_point.x = final_vector.x
			smoothed_point.y = final_vector.y
			smoothed_point.z = final_vector.z

			//	Broadcast the new point
			if (isNull(listener) === false && isNull(event_name) === false) {
				listener.dispatchEvent(new CustomEvent('smoothed', {
					'detail': {
						'point': smoothed_point, 'index': index, 'length': length, }
					}
				))
			}

			//	Store point for returning as a separate data set
			// if (points === true) {
			// 	last(smoothed_points_by_bounds).push(smoothed_point)
			// }

			//	Update the input data set
			// set(data, '[' + index + '].coordinates.cartesian.smoothed', smoothed_point)
		}

		return smoothed_point
	}
	// })

	// if (points === true) {
	// 	return smoothed_points_by_bounds
	// }

	let index_test = 0
	let length = data.length
	let smoothed_points = []
	const temp_data = JSON.stringify(data)
	let cloned_data = JSON.parse(temp_data)
	let cloned_data_for_points = JSON.parse(temp_data)
	const loop = setInterval(() => {
		smoothed_points.push(smooth_by_averages(cloned_data, cloned_data_for_points.shift(), index_test, length, listener, event_name))
		index_test++
		if (index_test >= length) {
			clearInterval(loop)
		}
	}, interval)
}

//	Vector to the center of the bounds
// TODO: Unused
// function vector_to_center(data:Coordinate.GeographicBounds): Array<number> {
// 	window.console.log('parser.vector_to_center')

// 	return ecef(
// 		((data.latitude_northmost + data.latitude_southmost) / 2),
// 		((data.longitude_westmost + data.longitude_eastmost) / 2)
// 	)
// }

//	Vector to the north pole
function vector_to_north_pole(): Coordinate.Cartesian3D {
	window.console.log('parser.vector_to_north_pole')

	const ecef_vector: Array<number> = ecef(90, 0)
	return { x: ecef_vector[0], y: ecef_vector[1], z: ecef_vector[2] }
}

//	Prep coord data for AFrame
// TODO: Unused
// function coords_to_string(data, path): any {
// 	window.console.log('parser.coords_to_string')

// 	const strings = []
// 	data.forEach(function (point) {
// 		strings.push(get(point, path + '.x') + ' ' + get(point, path + '.y') + ' ' + get(point, path + '.z'))
// 	})
// 	return strings.join(', ')
// }

//	Prep lap data for AFrame
// TODO: Unused
// function laps_to_string(data: Array<string>): string {
// 	window.console.log('parser.laps_to_string')

// 	const strings = new Array<string>()
// 	data.forEach(function (lap_start: string) {
// 		strings.push(lap_start)
// 	})
// 	return strings.join(', ')
// }

//	Prep vector data for AFrame
function vector_to_string(data: Coordinate.Quaternion): string {
	window.console.log('parser.vector_to_string')

	const strings = new Array<string>()
	if (isUndefined(data.x) === false) {
		strings.push(String(data.x))
	}
	if (isUndefined(data.y) === false) {
		strings.push(String(data.y))
	}
	if (isUndefined(data.z) === false) {
		strings.push(String(data.z))
	}
	if (isUndefined(data.w) === false) {
		strings.push(String(data.w))
	}
	return strings.join(', ')
}

export { from_csv, racing_line_points, smooth, vector_to_north_pole, vector_to_string }
