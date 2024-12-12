import * as AFRAME from 'aframe'
import * as ecef from 'geodetic-to-ecef'
import { RacingLinePoint } from './../models/Logs'
import { Coordinate } from './../models/Geometry'
import { Log } from './../models/Logs'
import { State } from './../models/States'
import { WebWorker } from './../models/Workers'
import * as util_graphing from './../utilities/graphing'

export default class LapGraphs {
	root_el: AFRAME.Entity
	coordinates_raw_el: AFRAME.Entity
	coordinates_smooth_el: AFRAME.Entity
	speed_el: AFRAME.Entity

	lap_points: Array<RacingLinePoint>
	vector_to_center: Coordinate.Cartesian3D
	scaling_factor: number
	session_name: string

	constructor(document: HTMLDocument, session_name: string, lap_points: Array<RacingLinePoint>, vector_to_center: Coordinate.Cartesian3D, scaling_factor: number) {
		this.lap_points = lap_points
		this.vector_to_center = vector_to_center
		this.scaling_factor = scaling_factor
		this.session_name = session_name

		//	Three significant vectors
		//	 - to the center of the track bounds in earth space
		//	 - to the north pole ('up') in earth space
		//	 - cross product along which to rotate to translate from one to the other
		const ecef_vector: Array<number> = ecef(90, 0)
		const vector_to_north_pole = { x: ecef_vector[0], y: ecef_vector[1], z: ecef_vector[2] }
		const v3_to_north_pole = new AFRAME.THREE.Vector3(vector_to_north_pole.x, vector_to_north_pole.y, vector_to_north_pole.z)

		//	Compute the cross product
		const v3_cross = new AFRAME.THREE.Vector3(0, 0, 0)
		const v3_to_center = new AFRAME.THREE.Vector3(vector_to_center.x, vector_to_center.y, vector_to_center.z)
		v3_cross.crossVectors(v3_to_center, v3_to_north_pole)
		v3_cross.normalize()

		//	Angle of the rotation to re-orient 'up'
		const angle = v3_to_center.angleTo(v3_to_north_pole)

		//	Quaternion describing the rotation
		const reorientation_quaternion = new AFRAME.THREE.Quaternion()
		reorientation_quaternion.setFromAxisAngle(v3_cross, angle)

		this.root_el = document.createElement('a-entity')
		this.root_el.setAttribute('position', '0.0 0.0 0.0')

		//	Raw coordinates
		this.coordinates_raw_el = document.createElement('a-entity')
		this.coordinates_raw_el.setAttribute('position', '0.0 0.0 -0.005')
		this.coordinates_raw_el.setAttribute('scale', this.scaling_factor + ' ' + this.scaling_factor + ' ' + this.scaling_factor)
		this.coordinates_raw_el.setAttribute('racing_line', {
			colour: '#D1002A',
			coords: '',
			length: lap_points.length,
			reorientation_quaternion: this.vector_to_string(reorientation_quaternion),
		})

		//	Smoothed coordinates
		this.coordinates_smooth_el = document.createElement('a-entity')
		this.coordinates_smooth_el.setAttribute('position', '0.0 0.0 0.0')
		this.coordinates_smooth_el.setAttribute('scale', this.scaling_factor + ' ' + this.scaling_factor + ' ' + this.scaling_factor)
		this.coordinates_smooth_el.setAttribute('racing_line', {
			colour: '#FF66FF',
			coords: '',
			length: lap_points.length,
			reorientation_quaternion: this.vector_to_string(reorientation_quaternion),
		})

		//	Speed
		this.speed_el = document.createElement('a-entity')
		this.speed_el.setAttribute('position', '0.0 0.0 0.0')
		this.speed_el.setAttribute('scale', this.scaling_factor + ' ' + this.scaling_factor + ' ' + this.scaling_factor)
		this.speed_el.setAttribute('line_graph', {
			coords: '',
			length: lap_points.length,
			reorientation_quaternion: this.vector_to_string(reorientation_quaternion),
		})
		this.speed_el.setAttribute('filled_graph', {
			coords: '',
			length: lap_points.length,
			reorientation_quaternion: this.vector_to_string(reorientation_quaternion),
		})

		//	Assemble the elements
		this.root_el.appendChild(this.coordinates_raw_el)
		this.root_el.appendChild(this.coordinates_smooth_el)
		this.root_el.appendChild(this.speed_el)

		//	Draw the lines
		this.draw_line(lap_points, 'coordinates.cartesian.raw', this.coordinates_raw_el)
		window.setTimeout(() => {
			this.draw_line(lap_points, 'coordinates.cartesian.smoothed', this.coordinates_smooth_el)
			window.setTimeout(() => {
				this.draw_delta_graph(lap_points, 'coordinates.cartesian.smoothed', 'performance.speed', 'delta.speed', this.speed_el, v3_to_center, 0.5)
			}, 150)
		}, 150)

		//	Listen to the global state
		State.Global.getInstance().$session_deleted.subscribe((session: Log.Session) => {
			if (session.name === this.session_name) {
				this.root_el.parentElement?.removeChild(this.root_el)
			}
		})
	}

	vector_to_string(coordinate: Coordinate.Quaternion): string {
		const strings = new Array<string>()
		if (coordinate.x) {
			strings.push(String(coordinate.x))
		}
		if (coordinate.y) {
			strings.push(String(coordinate.y))
		}
		if (coordinate.z) {
			strings.push(String(coordinate.z))
		}
		if (coordinate.w) {
			strings.push(String(coordinate.w))
		}
		return strings.join(', ')
	}

	draw_line(
		lap_points: Array<RacingLinePoint>,
		source_path: string,
		target_el: AFRAME.Entity,
	): void {
		const grapher = new Worker(new URL('./../workers/grapher.js', import.meta.url))

		let coords = new Array<string>()
		let parsed_message: {
			command: string,
			points: Array<Coordinate.Cartesian3D>,
			index: number,
		} | null = null
		const grapher_message = (event: MessageEvent) => {
			parsed_message = JSON.parse(event.data)

			switch (parsed_message?.command) {
				case WebWorker.Task.PointsGraphed:
					coords = parsed_message.points.map(AFRAME.utils.coordinates.stringify)

					target_el.setAttribute('racing_line', { streamed_coords: coords.join(', '), streamed_index: parsed_message.index })
					break

				case WebWorker.Task.Terminate:
					coords = new Array<string>()
					parsed_message = null

					grapher.removeEventListener('message', grapher_message)
					break
			}
		}
		grapher.addEventListener('message', grapher_message)

		//	Iteratively feed in the raw coordinates to the graphing worker
		let loop_index = 0
		const loop_size = 10
		const loop_limit = lap_points.length

		const interval_id = window.setInterval(() => {
			if ((loop_index * loop_size) < loop_limit) {
				grapher.postMessage(JSON.stringify({
					command:			WebWorker.Task.GraphPointsBatch,
					index:				(loop_index * loop_size),
					path_floor:			source_path,
					points:				lap_points.slice((loop_index * loop_size), ((loop_index + 1) * loop_size)),
					steps:				loop_size,
					value_function:		util_graphing.line.name,
				}))
				loop_index++
			}
			else {
				window.clearInterval(interval_id)
				grapher.postMessage(JSON.stringify({
					command:			WebWorker.Task.GraphPointsFinished,
				}))
			}
		}, 1)
	}

	draw_delta_graph(
		lap_points: Array<RacingLinePoint>,
		source_path_floor: string,
		source_path_value: string,
		source_path_delta: string,
		target_el: AFRAME.Entity,
		up_vector: Coordinate.Cartesian3D,
		scale: number,
	): void {
		const grapher = new Worker(new URL('./../workers/grapher.js', import.meta.url))

		let value_points = null
		let floor_points = null
		let delta_points = null
		let filled_coords = null
		let line_coords = null
		let delta_values = null
		let ordered_points = []

		let index = 0

		let parsed_message = null
		let grapher_message = function (event: MessageEvent) {
			parsed_message = JSON.parse(event.data)

			switch (parsed_message?.command) {
				case WebWorker.Task.PointsGraphed:
					value_points = parsed_message.points.values
					floor_points = parsed_message.points.floors
					delta_points = parsed_message.points.deltas

					//	Set the order of the points for the filled surface
					//	Note: It goes floor, value, floor, value, floor, value
					// TODO: This is kind of bonkers, should change it
					ordered_points = []
					for (index = 0, length = value_points.length; index < length; index++) {
						ordered_points.push(floor_points[index])
						ordered_points.push(value_points[index])
					}

					filled_coords = ordered_points.map(AFRAME.utils.coordinates.stringify)
					line_coords = value_points.map(AFRAME.utils.coordinates.stringify)

					target_el.setAttribute('filled_graph', { streamed_coords: filled_coords.join(', '), streamed_deltas: delta_points.join(', '), streamed_index: parsed_message.index })
					target_el.setAttribute('line_graph', { streamed_coords: line_coords.join(', '), streamed_index: parsed_message.index })
					break

				case WebWorker.Task.Terminate:
					value_points = undefined
					floor_points = undefined
					filled_coords = undefined
					line_coords = undefined

					parsed_message = undefined

					grapher.removeEventListener('message', grapher_message)
					break
			}
		}
		grapher.addEventListener('message', grapher_message)

		//	Iteratively feed in the smoothed points and performance data to the graphing worker
		let loop_index = 0
		const loop_size = 10
		const loop_limit = lap_points.length

		const interval_id = window.setInterval(() => {
			if ((loop_index * loop_size) < loop_limit) {
				grapher.postMessage(JSON.stringify({
					command:				WebWorker.Task.GraphPointsBatch,
					index:					(loop_index * loop_size),
					path_delta:				source_path_delta,
					path_floor:				source_path_floor,
					path_value:				source_path_value,
					points:					lap_points.slice((loop_index * loop_size), ((loop_index + 1) * loop_size)),
					offset_vector_coords:	{ x: up_vector.x, y: up_vector.y, z: up_vector.z },
					scale:					scale,
					steps:					loop_size,
					value_function:			util_graphing.delta_fill.name,
				}))
				loop_index++
			}
			else {
				window.clearInterval(interval_id)
				grapher.postMessage(JSON.stringify({
					command:			WebWorker.Task.GraphPointsFinished,
				}))
			}
		}, 1)
	}
}
