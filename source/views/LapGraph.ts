import * as AFRAME from 'aframe'
import { RacingLinePoint } from './../models/Logs'
import { Coordinate } from './../models/Geometry'
import { WebWorker } from './../models/Workers'
import * as util_file_parser from './../utilities/file_parser'
import * as util_graphing from './../utilities/graphing'

export default class LapGraph {
	root_el: AFRAME.Entity
	coordinates_raw_el: AFRAME.Entity
	coordinates_smooth_el: AFRAME.Entity

	lap_points: Array<RacingLinePoint>
	vector_to_center: Coordinate.Cartesian3D
	scaling_factor: number

	constructor(document: HTMLDocument, lap_points: Array<RacingLinePoint>, vector_to_center: Coordinate.Cartesian3D, scaling_factor: number) {
		this.lap_points = lap_points
		this.vector_to_center = vector_to_center
		this.scaling_factor = scaling_factor

		//	Three significant vectors
		//	 - to the center of the track bounds in earth space
		//	 - to the north pole ('up') in earth space
		//	 - cross product along which to rotate to translate from one to the other
		const v3_to_center =			new AFRAME.THREE.Vector3(vector_to_center.x, vector_to_center.y, vector_to_center.z)
		const vector_to_north_pole =	util_file_parser.vector_to_north_pole()
		const v3_to_north_pole =		new AFRAME.THREE.Vector3(vector_to_north_pole.x, vector_to_north_pole.y, vector_to_north_pole.z)
		const v3_cross =				new AFRAME.THREE.Vector3(0, 0, 0)

		//	Compute the cross product
		v3_cross.crossVectors(v3_to_center, v3_to_north_pole)
		v3_cross.normalize()

		//	Angle of the rotation to re-orient 'up'
		const angle =					v3_to_center.angleTo(v3_to_north_pole)

		//	Quaternion describing the rotation
		const reorientation_quaternion =	new AFRAME.THREE.Quaternion()
		reorientation_quaternion.setFromAxisAngle(v3_cross, angle)

		this.root_el = document.createElement('a-entity')
		this.root_el.setAttribute('position', '0.0 0.0 0.0')

		this.coordinates_raw_el = document.createElement('a-entity')
		this.coordinates_raw_el.setAttribute('position', '0.0 0.0 -0.005')
		this.coordinates_raw_el.setAttribute('scale', this.scaling_factor + ' ' + this.scaling_factor + ' ' + this.scaling_factor)
		this.coordinates_raw_el.setAttribute('racing_line', {
			colour: '#D1002A',
			coords: '',
			length: lap_points.length,
			reorientation_quaternion: util_file_parser.vector_to_string(reorientation_quaternion),
		})

		this.coordinates_smooth_el = document.createElement('a-entity')
		this.coordinates_smooth_el.setAttribute('position', '0.0 0.0 0.0')
		this.coordinates_smooth_el.setAttribute('scale', this.scaling_factor + ' ' + this.scaling_factor + ' ' + this.scaling_factor)
		this.coordinates_smooth_el.setAttribute('racing_line', {
			colour: '#FF66FF',
			coords: '',
			length: lap_points.length,
			reorientation_quaternion: util_file_parser.vector_to_string(reorientation_quaternion),
		})

		this.root_el.appendChild(this.coordinates_raw_el)
		this.root_el.appendChild(this.coordinates_smooth_el)

		this.draw_line(lap_points, 'coordinates.cartesian.raw', this.coordinates_raw_el)

		// TODO: Check for availability of the smoothed points
		window.setTimeout(() => {
			this.draw_line(lap_points, 'coordinates.cartesian.smoothed', this.coordinates_smooth_el)
		}, 250)

		//	TODO: Should probably wrap this all up in a big fat promise
		// render_smoothed_line(lap_points, v3_to_center, reorientation_quaternion)
		// this.draw_coordinates_smooth(document, lap_points, vector_to_center, 0.1)
	}

	draw_line(lap_points: Array<RacingLinePoint>, source_path: string, target_el: AFRAME.Entity): void {
		//	Instantiate a new worker
		const grapher = new Worker(new URL('./../workers/grapher.js', import.meta.url))

		//	Draw raw GPS racing line
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
		const loop_size = 20
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
}
