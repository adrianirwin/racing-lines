import get from 'lodash/get'
import isNaN from 'lodash/isNaN'
import isNull from 'lodash/isNull'
import set from 'lodash/set'
import * as ecef from 'geodetic-to-ecef'
import * as Papa from 'papaparse'
import {
	Coordinate,
	RacingLinePoint,
	WorkerTask,
} from './../models/racing_lines'
import * as references from './../references'

self.addEventListener(
	'message',
	(event: MessageEvent): void => {
		const message: FileList = event.data

		const fileReader = new FileReader()

		fileReader.onload = (): void => {
			const csv = fileReader.result as string

			const parsed: Papa.ParseResult<Array<number>> = Papa.parse(self.atob(csv.split(',')[1]).replace(/"/g, ''), { delimiter: ',', dynamicTyping: true, header: false })

			const racing_line_points = new Array<RacingLinePoint>()
			const lap_boundaries = new Array<number>()
			const bounds_coords: Coordinate.GeographicBounds = {
				latitude_northmost: NaN,
				latitude_southmost: NaN,
				longitude_westmost: NaN,
				longitude_eastmost: NaN,
			}

			let gps_index = 0
			let most_recent_lap = 0
			let previous_point: RacingLinePoint | null = null

			//	TODO: Move out of here - add an alternate command to include this
			const device_profile: any = references.device('RaceCapture/Pro MK3')

			parsed.data.forEach((row: Array<number>, index: number): void => {
				//	TODO: Interpolation

				const latitude = row[get(device_profile, 'log_indicies.gps.latitude')]
				const longitude = row[get(device_profile, 'log_indicies.gps.longitude')]

				const current_lap = row[get(device_profile, 'log_indicies.performance.current_lap')]

				//	Skip header row and rows without GPS coords
				//	TODO: Don't skip the non-GPS rows
				if (
					index > 0
					&& isNull(latitude) === false
					&& isNull(longitude) === false
				) {

					//	Populate new data point

					//	A: Parsed values
					// const point = new references.Racing_Line_Point()
					const cartesian_coords = ecef(latitude, longitude)

					// TODO: Hack
					const temp: any = {}

					// references.value_to_point(point, 'coordinates.gps', {
					// 	'latitude': latitude,
					// 	'longitude': longitude,
					// })

					// references.value_to_point(point, 'coordinates.cartesian.raw', {
					// 	'x': cartesian_coords[0],
					// 	'y': cartesian_coords[1],
					// 	'z': cartesian_coords[2],
					// })

					references.log_to_point(temp, row, device_profile, 'g', ['x', 'y', 'z'])
					references.log_to_point(temp, row, device_profile, 'rotation', ['yaw', 'pitch', 'roll'])
					references.log_to_point(temp, row, device_profile, 'timing', ['interval', 'utc'])
					references.log_to_point(temp, row, device_profile, 'performance', ['speed', 'current_lap'])
					references.log_to_point(temp, row, device_profile, 'diagnostics', ['coolant_temperature', 'oil_temperature', 'oil_pressure', 'battery_voltage'])

					//	B: Inferred values
					references.delta_to_point(temp, previous_point, 'delta', 'speed', 'performance', 'speed')

					//	Store the points
					const racing_line_point: RacingLinePoint = {
						coordinates: {
							cartesian: {
								raw: {
									x: cartesian_coords[0],
									y: cartesian_coords[1],
									z: cartesian_coords[2],
								},
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
					previous_point = racing_line_point
					racing_line_points.push(racing_line_point)

					//	Check current lat/lon against existing bounds
					if (isNaN(bounds_coords.latitude_northmost) === true || latitude > bounds_coords.latitude_northmost) {
						bounds_coords.latitude_northmost = latitude
					}

					if (isNaN(bounds_coords.latitude_southmost) === true || latitude < bounds_coords.latitude_southmost) {
						bounds_coords.latitude_southmost = latitude
					}

					if (isNaN(bounds_coords.longitude_westmost) === true || longitude > bounds_coords.longitude_westmost) {
						bounds_coords.longitude_westmost = longitude
					}

					if (isNaN(bounds_coords.longitude_eastmost) === true || longitude < bounds_coords.longitude_eastmost) {
						bounds_coords.longitude_eastmost = longitude
					}

					// TODO: What does this even do?
					if (most_recent_lap !== current_lap) {
						most_recent_lap = current_lap
						lap_boundaries.push(gps_index)
					}

					gps_index++
				}
			})

			//	Vector from the center of the Earth to the center of the bounds
			const vector_to_center: Array<number> = ecef(
				((bounds_coords.latitude_northmost + bounds_coords.latitude_southmost) / 2),
				((bounds_coords.longitude_westmost + bounds_coords.longitude_eastmost) / 2)
			)

			//	Re-center the XYZ points to have the center of the bounded area align to { x: 0, y: 0, z: 0 }
			racing_line_points.forEach((point: RacingLinePoint, index: number): void => {
				racing_line_points[index].coordinates.cartesian.raw.x -= vector_to_center[0]
				racing_line_points[index].coordinates.cartesian.raw.y -= vector_to_center[1]
				racing_line_points[index].coordinates.cartesian.raw.z -= vector_to_center[2]
				// set(racing_line_points, '[' + index + '].coordinates.cartesian.raw', {
				// 	x: (get(point, 'coordinates.cartesian.raw.x') - vector_to_center[0]),
				// 	y: (get(point, 'coordinates.cartesian.raw.y') - vector_to_center[1]),
				// 	z: (get(point, 'coordinates.cartesian.raw.z') - vector_to_center[2])
				// })
			})

			// TODO: Quick and dirty delta smoothing -- move to somewhere better
			racing_line_points.forEach((point: RacingLinePoint, index: number): void => {

				const surrounding_values = [
					get(racing_line_points, '[' + (index - 8) + '].delta.speed', 0),
					get(racing_line_points, '[' + (index - 7) + '].delta.speed', 0),
					get(racing_line_points, '[' + (index - 6) + '].delta.speed', 0),
					get(racing_line_points, '[' + (index - 5) + '].delta.speed', 0),
					get(racing_line_points, '[' + (index - 4) + '].delta.speed', 0),
					get(racing_line_points, '[' + (index - 3) + '].delta.speed', 0),
					get(racing_line_points, '[' + (index - 2) + '].delta.speed', 0),
					get(racing_line_points, '[' + (index - 1) + '].delta.speed', 0),
					get(racing_line_points, '[' + (index + 0) + '].delta.speed', 0),
					get(racing_line_points, '[' + (index + 1) + '].delta.speed', 0),
					get(racing_line_points, '[' + (index + 2) + '].delta.speed', 0),
					get(racing_line_points, '[' + (index + 3) + '].delta.speed', 0),
					get(racing_line_points, '[' + (index + 4) + '].delta.speed', 0),
					get(racing_line_points, '[' + (index + 5) + '].delta.speed', 0),
					get(racing_line_points, '[' + (index + 6) + '].delta.speed', 0),
					get(racing_line_points, '[' + (index + 7) + '].delta.speed', 0),
					get(racing_line_points, '[' + (index + 8) + '].delta.speed', 0),
				]

				const total = surrounding_values.reduce((accumulator: number, current: number): number => {
					return accumulator + current
				}, 0)

				const average = total / 17

				racing_line_points[index].delta.speed = average
			})

			//	Remove the '0' boundary
			lap_boundaries.splice(0, 1)

			self.postMessage(JSON.stringify({
				command:			WorkerTask.MetadataLoaded,
				bounds_coords,
				vector_to_center,
				lap_boundaries,
			}))

			let loop_index = 0
			const loop_size = 200 // TODO: Perf test the ideal size
			const loop_limit = racing_line_points.length

			const interval_id = self.setInterval((): void => {
				if ((loop_index * loop_size) < loop_limit) {
					self.postMessage(JSON.stringify({
						command:			WorkerTask.PointsLoaded,
						points:				racing_line_points.slice((loop_index * loop_size), ((loop_index + 1) * loop_size)),
					}))
					loop_index++
				}
				else {
					//	Clean up listeners in the main thread and stop the loop
					self.clearInterval(interval_id)
					self.postMessage(JSON.stringify({
						command:			WorkerTask.Terminate,
					}))
				}
			}, 1)

		}

		fileReader.readAsDataURL(message[0])
})
