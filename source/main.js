//	Libraries
import * as AFRAME from 'aframe';
import * as _ from 'lodash';
import * as parser from './parser';
import * as loader from './loader';
import * as references from './references';
import * as utilities from './utilities';
import * as graphs from './graphs';

//	Custom A-Frame Components
import './aframe/components';

//	Styles
import './styles/main.scss';

//	Web Workers
const workers = {
	loader: new Worker(new URL('./workers/loader.js', import.meta.url)),
	smoother: new Worker(new URL('./workers/smoother.js', import.meta.url)),
	grapher: new Worker(new URL('./workers/grapher.js', import.meta.url)),
};

//	Globals
const vr_ui_elements = [];

//	Add A-Frame's <a-scene> to start the scene
function start_aframe(callback, callback_vr_enter, callback_vr_exit) {
	window.console.log('start_aframe');

	$('body').append('<a-scene background="color: #353638">');
	$('a-scene').on('loaded', callback);

	if (_.isNull(callback_vr_enter) === false) {
		$('a-scene').on('enter-vr', callback_vr_enter);

		if (_.isNull(callback_vr_exit) === false) {
			$('a-scene').on('exit-vr', callback_vr_exit);
		}
	}
}

function start_web_ui() {
	window.console.log('start_web_ui');

	allow_file_upload();
	start_vr_scene();
}

function allow_file_upload() {
	loader.add_listener(workers.loader, document.querySelector('input[name="log_file"]'), file_finished_loading);
}

function file_finished_loading(values) {
	render_racing_line(values);
	allow_file_upload();
}

function start_vr_ui() {
	window.console.log('start_vr_ui');

	const camera = document.querySelector('a-entity[camera]');

	const text = document.createElement('a-entity');
	text.setAttribute('position', '0.04 0 -0.5');
	text.setAttribute('text', {
		'width': 0.2,
		'anchor': 'center',
		'color': 'rgb(240, 240, 255)',
		'value': 'HUD - Coming Soon'
	});
	camera.appendChild(text);

	vr_ui_elements.push(text);
}

function exit_vr_ui() {
	window.console.log('exit_vr_ui');

	//	Remove UI elements only shown in VR
	while(vr_ui_elements.length > 0) {
		let element = vr_ui_elements.pop();
		element.parentNode.removeChild(element);
	}
}

function start_vr_scene() {
	window.console.log('start_vr_scene');

	const scene = document.querySelector('a-scene');

	//	Ground Plane Grid
	const ground_plane = document.createElement('a-entity');
	ground_plane.setAttribute('ground_plane', {'count': 150, 'gap': 1, 'size': 0.025});
	ground_plane.setAttribute('position', '0 -1.5 0');
	scene.appendChild(ground_plane);

	//	Oculus Touch Controllers
	//	TODO: Handle Phone, Desktop, 3DOF, and 6DOF inputs
	const hand_controls_left = document.createElement('a-entity');
	const hand_controls_right = document.createElement('a-entity');

	hand_controls_left.setAttribute('oculus-touch-controls', {'hand': 'left'});
	hand_controls_right.setAttribute('oculus-touch-controls', {'hand': 'right'});
	hand_controls_left.setAttribute('id', 'left_hand');
	hand_controls_right.setAttribute('id', 'right_hand');

	scene.appendChild(hand_controls_left);
	scene.appendChild(hand_controls_right);

	//	Model position correction
	//	TODO: This is a hack, just PR it back into A-Frame itself
	hand_controls_left.addEventListener('object3dset', function (event) {
		window.setTimeout((hand_controls_left, hand_controls_right) => {
			hand_controls_left.components['obj-model'].model.position.copy(new THREE.Vector3(-0.006, 0.004, -0.053));
			hand_controls_right.components['obj-model'].model.position.copy(new THREE.Vector3(0.006, 0.004, -0.053));
		}, 250, hand_controls_left, hand_controls_right);
	});
}

function render_racing_line(values) {
	window.console.log('render_racing_line');

	const racing_line_points = values.points;
	const bounds_coords = values.bounds_coords;
	const vector_to_center = values.vector_to_center;
	const lap_boundaries = values.lap_boundaries;

	//	TODO: Set dynamically/allow user input?
	const scaling_factor =			0.01;

	//	Trim the data to speed up development
	const first_lap =				racing_line_points.slice(0, lap_boundaries[0]);
	const first_lap_test =			racing_line_points.slice(0, lap_boundaries[0]);
	const second_lap_test =			racing_line_points.slice(lap_boundaries[1], lap_boundaries[2]);

	//	Three significant vectors
	//	 - to the center of the track bounds in earth space
	//	 - to the north pole ('up') in earth space
	//	 - cross product along which to rotate to translate from one to the other
	const v3_to_center =			new THREE.Vector3(vector_to_center[0], vector_to_center[1], vector_to_center[2]);
	const vector_to_north_pole =	parser.vector_to_north_pole();
	const v3_to_north_pole =		new THREE.Vector3(vector_to_north_pole[0], vector_to_north_pole[1], vector_to_north_pole[2]);
	let v3_cross =					new THREE.Vector3(0, 0, 0);

	//	Compute the cross product
	v3_cross.crossVectors(v3_to_center, v3_to_north_pole);
	v3_cross.normalize();

	//	Angle of the rotation to re-orient 'up'
	const angle =					v3_to_center.angleTo(v3_to_north_pole);

	//	Quaternion describing the rotation
	var reorientation_quaternion =	new THREE.Quaternion();
	reorientation_quaternion.setFromAxisAngle(v3_cross, angle);

	//	Select and create elements
	const scene =					document.querySelector('a-scene');
	const racing_graphs =			document.createElement('a-entity');
	const raw_line =				document.createElement('a-entity');

	//	Place the racing line in the scene
	racing_graphs.appendChild(raw_line);
	scene.appendChild(racing_graphs);

	//	TODO: Replace with swizzle function to set correct Z?
	racing_graphs.object3D.rotation.x += (-90 * (Math.PI / 180));
	racing_graphs.setAttribute('scale', (scaling_factor + ' ' + scaling_factor + ' ' + scaling_factor));
	racing_graphs.setAttribute('position', '0.0 1.0 -1.0');
	racing_graphs.setAttribute('id', 'racing_graphs');

	raw_line.setAttribute('position', '0.0 0.0 -1.0');

	//	Assign the racing line component to the raw and smoother line entities
	raw_line.setAttribute('racing_line', {
		coords: '',
		length: second_lap_test.length,
		reorientation_quaternion: parser.vector_to_string(reorientation_quaternion)
	});

	//	Draw raw GPS racing line
	let coords = null;
	let parsed_message = null;
	let grapher_message = function (event) {
		parsed_message = JSON.parse(event.data);

		switch (parsed_message.command) {
			case 'point':
				coords = parsed_message.points.map(AFRAME.utils.coordinates.stringify);
				coords = coords.join(', ');
				raw_line.setAttribute('racing_line',  { streamed_coords: coords, streamed_index: parsed_message.index });
				break;

			case 'terminate':
				coords = undefined;
				parsed_message = undefined;

				utilities.clean_up_worker(workers.grapher, grapher_message, 'message');

				//	TODO: Should probably wrap this all up in a big fat promise
				render_smoothed_line(second_lap_test, v3_to_center, reorientation_quaternion);
				break;
		}
	}
	workers.grapher.addEventListener('message', grapher_message);

	//	Iteratively feed in the raw coordinates to the graphing worker
	let loop_index = 0;
	const loop_size = 200;
	const loop_limit = second_lap_test.length;

	const interval_id = window.setInterval((context) => {
		if ((loop_index * loop_size) < loop_limit) {
			workers.grapher.postMessage(JSON.stringify({
				'command': 'points',
				'points': second_lap_test.slice((loop_index * loop_size), ((loop_index + 1) * loop_size))
			}));
			loop_index++;
		} else {
			window.clearInterval(interval_id);
			workers.grapher.postMessage(JSON.stringify({
				'command': 'start',
				'floor_path': 'coordinates.cartesian.raw',
				'steps': 100,
				'value_function': graphs.line.name
			}));
		}
	}, 1, this);
}

function render_smoothed_line(lap_points, up_vector, reorientation_quaternion) {
	window.console.log('render_smoothed_line');

	const racing_graphs = document.querySelector('#racing_graphs');
	const smoothed_line = document.createElement('a-entity');

	racing_graphs.appendChild(smoothed_line);

	//	Assign the smoothed line component
	smoothed_line.setAttribute('racing_line', {
		coords: '',
		length: lap_points.length,
		reorientation_quaternion: parser.vector_to_string(reorientation_quaternion),
		colour: '#FF66FF'
	});

	let smoothed_coords = null;
	let index = 0;

	//	Run smoothing algorithm on current lap
	let parsed_message = null;
	let smoother_message = function (event) {
		parsed_message = JSON.parse(event.data);

		switch (parsed_message.command) {
			case 'points':
				smoothed_coords = parsed_message.points.map(AFRAME.utils.coordinates.stringify);
				smoothed_coords = smoothed_coords.join(', ');

				smoothed_line.setAttribute('racing_line', 'streamed_coords', smoothed_coords);

				//	Update the existing dataset
				for (index = 0, length = parsed_message.points.length; index < length; index++) {
					_.set(lap_points, '[' + (_.get(parsed_message, 'index', 0) + index) + '].coordinates.cartesian.smoothed', parsed_message.points[index]);
				}
				break;

			case 'terminate':
				smoothed_coords = undefined;
				index = undefined;
				parsed_message = undefined;

				utilities.clean_up_worker(workers.smoother, smoother_message, 'message');

				//	TODO: Should probably wrap this all up in a big fat promise
				render_graphs(lap_points, up_vector, reorientation_quaternion);
				break;
		}
	}
	workers.smoother.addEventListener('message', smoother_message);

	//	Iteratively feed in the points to the smoothing worker
	let loop_index = 0;
	const loop_size = 100;
	const loop_limit = lap_points.length;

	const interval_id = window.setInterval((context) => {
		if ((loop_index * loop_size) < loop_limit) {
			workers.smoother.postMessage(JSON.stringify({
				'command': 'points',
				'points': lap_points.slice((loop_index * loop_size), ((loop_index + 1) * loop_size))
			}));
			loop_index++;
		} else {
			window.clearInterval(interval_id);
			workers.smoother.postMessage(JSON.stringify({
				'command': 'start',
				'bounds': [320, 160, 80, 40, 20],
				'weights': [0.03, 0.07, 0.9],
				'steps': 50
			}));
		}
	}, 1, this);
}

function render_graphs(lap_points, up_vector, reorientation_quaternion) {
	window.console.log('render_graphs');

	const racing_graphs = document.querySelector('#racing_graphs');
	const graphed_line = document.createElement('a-entity');

	racing_graphs.appendChild(graphed_line);

	//	Assign the line graph component
	graphed_line.setAttribute('filled_graph', {
		coords: '',
		length: lap_points.length,
		reorientation_quaternion: parser.vector_to_string(reorientation_quaternion)
	});

	graphed_line.setAttribute('line_graph', {
		coords: '',
		length: lap_points.length,
		reorientation_quaternion: parser.vector_to_string(reorientation_quaternion)
	});

	//	Draw speed graph
	let value_points = null;
	let floor_points = null;
	let filled_coords = null;
	let line_coords = null;
	let ordered_points = [];

	let index = 0

	let parsed_message = null;
	let grapher_message = function (event) {
		parsed_message = JSON.parse(event.data);

		switch (parsed_message.command) {
			case 'point':
				//	"Grow" the graphed line
				value_points = parsed_message.points.values;
				floor_points = parsed_message.points.floors;

				//	Set the order of the points for the filled surface
				ordered_points = [];
				for (index = 0, length = value_points.length; index < length; index++) {
					ordered_points.push(floor_points[index]);
					ordered_points.push(value_points[index]);
				}

				filled_coords = ordered_points.map(AFRAME.utils.coordinates.stringify);
				filled_coords = filled_coords.join(', ');

				line_coords = value_points.map(AFRAME.utils.coordinates.stringify);
				line_coords = line_coords.join(', ');

				graphed_line.setAttribute('filled_graph', 'streamed_coords', filled_coords);
				graphed_line.setAttribute('line_graph', 'streamed_coords', line_coords);
				break;

			case 'terminate':
				value_points = undefined;
				floor_points = undefined;
				filled_coords = undefined;
				line_coords = undefined;

				parsed_message = undefined;

				utilities.clean_up_worker(workers.grapher, grapher_message, 'message');
				break;
		}
	}
	workers.grapher.addEventListener('message', grapher_message);

	//	Iteratively feed in the smoothed points and performance data to the graphing worker
	let loop_index = 0;
	const loop_size = 50;
	const loop_limit = lap_points.length;

	const interval_id = window.setInterval((context) => {
		if ((loop_index * loop_size) < loop_limit) {
			workers.grapher.postMessage(JSON.stringify({
				'command': 'points',
				'points': lap_points.slice((loop_index * loop_size), ((loop_index + 1) * loop_size))
			}));
			loop_index++;
		} else {
			window.clearInterval(interval_id);
			workers.grapher.postMessage(JSON.stringify({
				'command': 'start',
				'floor_path': 'coordinates.cartesian.smoothed',
				'value_path': 'performance.speed',
				'scale': 0.25,
				'steps': 50,
				'offset_vector_coords': { 'x': up_vector.x, 'y': up_vector.y, 'z': up_vector.z },
				'value_function': graphs.offset_fill.name
			}));
		}
	}, 1, this);
}

//	Start the Application
$(document).ready(function() {
	start_aframe(start_web_ui, start_vr_ui, exit_vr_ui);
});