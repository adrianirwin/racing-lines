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

//	Views
import SessionList from './views/SessionList'

//	A-Frame Components
import './components/FilledGraph'
import './components/GroundPlane'
import './components/LineGraph'
import './components/RacingDots'
import './components/RacingLine'
import './components/SessionList'
import './components/SessionSummary'
import './components/SmoothingInspector'

//	Styles
import './styles/main.scss'

//	Global State
const vr_ui_elements = new Array<HTMLElement>()
const views = <{ [key: string]: any }>{}
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
	views['SessionList'].add_session(document, uploaded_sessions[session.name])

	allow_file_upload()
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
	scene.setAttribute('cursor', 'rayOrigin: mouse; fuse: false')
	scene.setAttribute('raycaster', 'objects: .raycastable')

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

	//	Graphs
	const racing_graphs = document.createElement('a-entity')
	racing_graphs.object3D.rotation.x += (-90 * (Math.PI / 180))
	racing_graphs.setAttribute('position', '0.0 1.0 -1.0')
	racing_graphs.setAttribute('id', 'racing_graphs')
	scene.appendChild(racing_graphs)

	//	Sessions List
	views['SessionList'] = new SessionList(document, racing_graphs)
	views['SessionList'].set_position(0.0, 1.6, -0.25)
	scene.appendChild(views['SessionList'].root_el)
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
