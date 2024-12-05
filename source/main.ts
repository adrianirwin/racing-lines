import * as AFRAME from 'aframe'
import get from 'lodash/get'
import isNull from 'lodash/isNull'
import set from 'lodash/set'
import { Coordinate } from './models/Geometry'
import {
	Log,
	RacingLinePoint,
} from './models/Logs'
import { State } from './models/States'
import { WebWorker } from './models/Workers'
import * as util_file_parser from './utilities/file_parser'
import * as util_file_uploader from './utilities/file_uploader'
import * as util_graphing from './utilities/graphing'

//	Custom A-Frame Components
import './components/FilledGraph'
import './components/GroundPlane'
import './components/LineGraph'
import './components/RacingDots'
import './components/RacingLine'
import './components/SessionList'
import './components/SmoothingInspector'

//	Styles
import './styles/main.scss'

//	Global State
const vr_ui_elements = new Array<HTMLElement>()
const uploaded_sessions = <State.Sessions>{}

//	Add A-Frame's <a-scene> to start the scene
function start_aframe(callback: () => void, callback_vr_enter: () => void, callback_vr_exit: () => void): void {
	window.console.log('start_aframe')

	// $('body').append('<a-scene stats background="color: #353638">')
	$('body').append('<a-scene background="color: #353638">')
	$('a-scene').on('loaded', callback)

	if (isNull(callback_vr_enter) === false) {
		$('a-scene').on('enter-vr', callback_vr_enter)

		if (isNull(callback_vr_exit) === false) {
			$('a-scene').on('exit-vr', callback_vr_exit)
		}
	}
}

function start_web_ui(): void {
	window.console.log('start_web_ui')

	allow_file_upload()
	start_vr_scene()
}

function allow_file_upload(): void {
	window.console.log('allow_file_upload')

	util_file_uploader.listen(
		document.getElementById('file_upload') as HTMLInputElement,
		new Worker(new URL('./workers/log_file_parser.js', import.meta.url)),
		file_finished_loading,
	)
}

function file_finished_loading(session: Log.Session): void {
	window.console.log('file_finished_loading')

	//	Store in the global state
	// TODO: For now...
	uploaded_sessions[session.name] = session

	const session_list = document.querySelector('a-entity[session_list]')
	session_list.setAttribute('session_list', { session: uploaded_sessions[session.name] })

	// augment_raw_session_values(session.name)
	render_racing_line(uploaded_sessions[session.name])
	allow_file_upload()
}

function augment_raw_session_values(session_name: string): void {
	const session = uploaded_sessions[session_name]
	session.processing = true

	//	Smooth GPS values
	const smoother = new Worker(new URL('./workers/smoother.js', import.meta.url))
	let index = 0
	let smoothed_coords: Array<string> | null = null
	let parsed_message: {
		command: string,
		points: Array<Coordinate.Cartesian3D>,
		index: number,
	} | null = null
	let smoother_message = (event: MessageEvent) => {
		parsed_message = JSON.parse(event.data)

		switch (parsed_message?.command) {
			case WebWorker.Task.PointsSmoothed:
				smoothed_coords = parsed_message.points.map(AFRAME.utils.coordinates.stringify)

				//	Update the existing dataset
				for (index = 0, length = parsed_message.points.length; index < length; index++) {
					set(session.points, '[' + (get(parsed_message, 'index', 0) + index) + '].coordinates.cartesian.smoothed', parsed_message.points[index])
				}
				break

			case WebWorker.Task.Terminate:
				smoothed_coords = null
				parsed_message = null

				smoother.removeEventListener('message', smoother_message)
				session.processing = false
				break
		}
	}
	smoother.addEventListener('message', smoother_message)

	//	Iteratively feed in the points to the smoothing worker
	let loop_index = 0
	const loop_size = 100
	const loop_limit = session.points.length

	const interval_id = window.setInterval(() => {
		if ((loop_index * loop_size) < loop_limit) {
			smoother.postMessage(JSON.stringify({
				command:			WebWorker.Task.SmoothPointsBatch,
				bounds:				[320, 160, 80, 40, 20],
				index:				(loop_index * loop_size),
				points:				session.points.slice(Math.max(((loop_index * loop_size) - 320), 0), (((loop_index + 1) * loop_size) + 320)),
				start_offset:		Math.min((loop_index * loop_size), 320),
				steps:				loop_size,
				weights:			[0.03, 0.07, 0.9],
			}))
			loop_index++
		}
		else {
			window.clearInterval(interval_id)
			smoother.postMessage(JSON.stringify({
				command:			WebWorker.Task.SmoothPointsFinished,
			}))
		}
	}, 1)
}

function start_vr_ui(): void {
	window.console.log('start_vr_ui')

	const camera = document.querySelector('a-entity[camera]')

	// const text = document.createElement('a-entity')
	// text.setAttribute('position', '0.04 0 -0.5')
	// text.setAttribute('text', {
	// 	'width': 0.2,
	// 	'anchor': 'center',
	// 	'color': 'rgb(240, 240, 255)',
	// 	'value': 'HUD - Coming Soon'
	// })
	// camera.appendChild(text)

	// vr_ui_elements.push(text)
}

function exit_vr_ui(): void {
	window.console.log('exit_vr_ui')

	//	Remove UI elements only shown in VR
	while(vr_ui_elements.length > 0) {
		let element = vr_ui_elements.pop()
		element?.parentNode?.removeChild(element)
	}
}

function start_vr_scene(): void {
	window.console.log('start_vr_scene')

	const scene = document.querySelector('a-scene')

	//	Ground Plane Grid
	const ground_plane = document.createElement('a-entity')
	ground_plane.setAttribute('ground_plane', {'count': 150, 'gap': 1, 'size': 0.025})
	ground_plane.setAttribute('position', '0 -1.5 0')
	scene.appendChild(ground_plane)

	//	Oculus Touch Controllers
	//	TODO: Handle Phone, Desktop, 3DOF, and 6DOF inputs
	const hand_controls_left: AFRAME.Entity = document.createElement('a-entity')
	const hand_controls_right: AFRAME.Entity = document.createElement('a-entity')

	hand_controls_left.setAttribute('oculus-touch-controls', {'hand': 'left'})
	// hand_controls_left.setAttribute('hand-controls', 'left')
	hand_controls_right.setAttribute('oculus-touch-controls', {'hand': 'right'})
	// hand_controls_right.setAttribute('hand-controls', 'right')
	hand_controls_left.setAttribute('id', 'left_hand')
	hand_controls_right.setAttribute('id', 'right_hand')

	scene.appendChild(hand_controls_left)
	scene.appendChild(hand_controls_right)

	//	Model position correction
	//	TODO: This is a hack, just PR it back into A-Frame itself
	// hand_controls_left.addEventListener('object3dset', function (event) {
	// 	window.setTimeout((hand_controls_left: AFRAME.Entity, hand_controls_right: AFRAME.Entity) => {
	// 		hand_controls_left.components['obj-model'].model.position.copy(new AFRAME.THREE.Vector3(-0.006, 0.004, -0.053))
	// 		hand_controls_right.components['obj-model'].model.position.copy(new AFRAME.THREE.Vector3(0.006, 0.004, -0.053))
	// 	}, 250, hand_controls_left, hand_controls_right)
	// })

	//	Sessions List
	const session_list = document.createElement('a-entity')

	session_list.setAttribute('position', '0.0 0.0 0.0')
	session_list.setAttribute('session_list', {})

	scene.appendChild(session_list)
}

function render_racing_line(session: Log.Session): void {
	window.console.log('render_racing_line')

	const racing_line_points = session.points
	const bounds_coords = session.bounds_coords
	const vector_to_center = session.vector_to_center
	const lap_first_point_indexes = session.lap_first_point_indexes

	//	TODO: Set dynamically/allow user input?
	const scaling_factor =			0.01

	//	Trim the data to speed up development
	const test_lap = session.points_for_lap(3)

	//	Three significant vectors
	//	 - to the center of the track bounds in earth space
	//	 - to the north pole ('up') in earth space
	//	 - cross product along which to rotate to translate from one to the other
	const v3_to_center =			new AFRAME.THREE.Vector3(vector_to_center[0], vector_to_center[1], vector_to_center[2])
	const vector_to_north_pole =	util_file_parser.vector_to_north_pole()
	const v3_to_north_pole =		new AFRAME.THREE.Vector3(vector_to_north_pole[0], vector_to_north_pole[1], vector_to_north_pole[2])
	let v3_cross =					new AFRAME.THREE.Vector3(0, 0, 0)

	//	Compute the cross product
	v3_cross.crossVectors(v3_to_center, v3_to_north_pole)
	v3_cross.normalize()

	//	Angle of the rotation to re-orient 'up'
	const angle =					v3_to_center.angleTo(v3_to_north_pole)

	//	Quaternion describing the rotation
	let reorientation_quaternion =	new AFRAME.THREE.Quaternion()
	reorientation_quaternion.setFromAxisAngle(v3_cross, angle)

	//	Select and create elements
	const scene =					document.querySelector('a-scene')
	const racing_graphs =			document.createElement('a-entity')
	const raw_line =				document.createElement('a-entity')

	//	Place the racing line in the scene
	racing_graphs.appendChild(raw_line)
	scene.appendChild(racing_graphs)

	//	TODO: Replace with swizzle function to set correct Z?
	racing_graphs.object3D.rotation.x += (-90 * (Math.PI / 180))
	racing_graphs.setAttribute('scale', (scaling_factor + ' ' + scaling_factor + ' ' + scaling_factor))
	racing_graphs.setAttribute('position', '0.0 1.0 -1.0')
	racing_graphs.setAttribute('id', 'racing_graphs')

	raw_line.setAttribute('position', '0.0 0.0 -1.0')

	//	Assign the racing line component to the raw and smoother line entities
	raw_line.setAttribute('racing_line', {
		coords: '',
		length: test_lap.length,
		reorientation_quaternion: util_file_parser.vector_to_string(reorientation_quaternion),
	})

	//	Draw raw GPS racing line
	const grapher = new Worker(new URL('./workers/grapher.js', import.meta.url))
	let coords: Array<string> | null = null
	let parsed_message: {
		command: string,
		points: Array<Coordinate.Cartesian3D>,
		index: number,
	} | null = null
	let grapher_message = function (event: MessageEvent) {
		parsed_message = JSON.parse(event.data)

		switch (parsed_message?.command) {
			case WebWorker.Task.PointsGraphed:
				coords = parsed_message.points.map(AFRAME.utils.coordinates.stringify)

				raw_line.setAttribute('racing_line',  { streamed_coords: coords.join(', '), streamed_index: parsed_message.index })
				break

			case WebWorker.Task.Terminate:
				coords = null
				parsed_message = null

				grapher.removeEventListener('message', grapher_message)

				//	TODO: Should probably wrap this all up in a big fat promise
				render_smoothed_line(test_lap, v3_to_center, reorientation_quaternion)
				break
		}
	}
	grapher.addEventListener('message', grapher_message)

	//	Iteratively feed in the raw coordinates to the graphing worker
	let loop_index = 0
	const loop_size = 200
	const loop_limit = test_lap.length

	const interval_id = window.setInterval(() => {
		if ((loop_index * loop_size) < loop_limit) {
			grapher.postMessage(JSON.stringify({
				command:			WebWorker.Task.GraphPointsBatch,
				index:				(loop_index * loop_size),
				path_floor:			'coordinates.cartesian.raw',
				points:				test_lap.slice((loop_index * loop_size), ((loop_index + 1) * loop_size)),
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

function render_smoothed_line(lap_points: Array<RacingLinePoint>, up_vector: Coordinate.Cartesian3D, reorientation_quaternion: Coordinate.Quaternion): void {
	window.console.log('render_smoothed_line')

	const racing_graphs = document.querySelector('#racing_graphs')
	const smoothed_line = document.createElement('a-entity')

	racing_graphs.appendChild(smoothed_line)

	//	Assign the smoothed line component
	smoothed_line.setAttribute('racing_line', {
		coords: '',
		length: lap_points.length,
		reorientation_quaternion: util_file_parser.vector_to_string(reorientation_quaternion),
		colour: '#FF66FF',
	})

	//	Run smoothing algorithm on current lap
	const smoother = new Worker(new URL('./workers/smoother.js', import.meta.url))
	let index = 0
	let smoothed_coords: Array<string> | null = null
	let parsed_message: {
		command: string,
		points: Array<Coordinate.Cartesian3D>,
		index: number,
	} | null = null
	let smoother_message = function (event: MessageEvent) {
		parsed_message = JSON.parse(event.data)

		switch (parsed_message?.command) {
			case WebWorker.Task.PointsSmoothed:
				smoothed_coords = parsed_message.points.map(AFRAME.utils.coordinates.stringify)

				smoothed_line.setAttribute('racing_line', { streamed_coords: smoothed_coords.join(', '), streamed_index: parsed_message.index })

				//	Update the existing dataset
				for (index = 0, length = parsed_message.points.length; index < length; index++) {
					set(lap_points, '[' + (get(parsed_message, 'index', 0) + index) + '].coordinates.cartesian.smoothed', parsed_message.points[index])
				}
				break

			case WebWorker.Task.Terminate:
				smoothed_coords = null
				parsed_message = null

				smoother.removeEventListener('message', smoother_message)

				//	TODO: Should probably wrap this all up in a big fat promise
				render_graphs(lap_points, up_vector, reorientation_quaternion)
				break
		}
	}
	smoother.addEventListener('message', smoother_message)

	//	Iteratively feed in the points to the smoothing worker
	let loop_index = 0
	const loop_size = 100
	const loop_limit = lap_points.length

	const interval_id = window.setInterval(() => {
		if ((loop_index * loop_size) < loop_limit) {
			smoother.postMessage(JSON.stringify({
				command:			WebWorker.Task.SmoothPointsBatch,
				bounds:				[320, 160, 80, 40, 20],
				index:				(loop_index * loop_size),
				points:				lap_points.slice(Math.max(((loop_index * loop_size) - 320), 0), (((loop_index + 1) * loop_size) + 320)),
				start_offset:		Math.min((loop_index * loop_size), 320),
				steps:				loop_size,
				weights:			[0.03, 0.07, 0.9],
			}))
			loop_index++
		}
		else {
			window.clearInterval(interval_id)
			smoother.postMessage(JSON.stringify({
				command:			WebWorker.Task.SmoothPointsFinished,
			}))
		}
	}, 1)
}

function render_graphs(lap_points: Array<RacingLinePoint>, up_vector: Coordinate.Cartesian3D, reorientation_quaternion: Coordinate.Quaternion): void {
	window.console.log('render_graphs')

	const racing_graphs = document.querySelector('#racing_graphs')
	const graphed_line = document.createElement('a-entity')

	racing_graphs.appendChild(graphed_line)

	//	Assign the line graph component
	graphed_line.setAttribute('filled_graph', {
		coords: '',
		length: lap_points.length,
		reorientation_quaternion: util_file_parser.vector_to_string(reorientation_quaternion),
	})

	graphed_line.setAttribute('line_graph', {
		coords: '',
		length: lap_points.length,
		reorientation_quaternion: util_file_parser.vector_to_string(reorientation_quaternion),
	})

	//	Draw speed graph
	const grapher = new Worker(new URL('./workers/grapher.js', import.meta.url))
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
				//	"Grow" the graphed line
				value_points = parsed_message.points.values
				floor_points = parsed_message.points.floors
				delta_points = parsed_message.points.deltas

				//	Set the order of the points for the filled surface
				ordered_points = []
				for (index = 0, length = value_points.length; index < length; index++) {
					ordered_points.push(floor_points[index])
					ordered_points.push(value_points[index])
				}

				filled_coords = ordered_points.map(AFRAME.utils.coordinates.stringify)
				line_coords = value_points.map(AFRAME.utils.coordinates.stringify)

				graphed_line.setAttribute('filled_graph', { streamed_coords: filled_coords.join(', '), streamed_deltas: delta_points.join(', '), streamed_index: parsed_message.index })
				graphed_line.setAttribute('line_graph', { streamed_coords: line_coords.join(', '), streamed_index: parsed_message.index })
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
	const loop_size = 50
	const loop_limit = lap_points.length

	const interval_id = window.setInterval(() => {
		if ((loop_index * loop_size) < loop_limit) {
			grapher.postMessage(JSON.stringify({
				command:				WebWorker.Task.GraphPointsBatch,
				index:					(loop_index * loop_size),
				path_delta:				'delta.speed',
				path_floor:				'coordinates.cartesian.smoothed',
				path_value:				'performance.speed',
				points:					lap_points.slice((loop_index * loop_size), ((loop_index + 1) * loop_size)),
				offset_vector_coords:	{ x: up_vector.x, y: up_vector.y, z: up_vector.z },
				scale:					0.5,
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

//	Start the Application
$(document).ready(function() {
	start_aframe(start_web_ui, start_vr_ui, exit_vr_ui)
})
