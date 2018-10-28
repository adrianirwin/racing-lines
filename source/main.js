//	Libraries
import * as AFRAME from 'aframe';
import * as _ from 'lodash';
import * as parser from './parser';
import * as references from './references';
import * as utilities from './utilities';
import * as graphs from './graphs';

//	Custom A-Frame Components
import './aframe/components';

//	Web Workers
import CSV_Parser from './workers/csv.js';
import Formatter from './workers/formatter.js';
import Smoother from './workers/smoother.js';
import Grapher from './workers/grapher.js';

//	Styles
import './styles/main.scss';

//	Globals
const vr_ui_elements = [];
const workers = {
	csv_parser: CSV_Parser(),
	formatter: Formatter(),
	smoother: Smoother(),
	grapher: Grapher()
};

window.starting_time = Date.now();

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

	data_input($('input[name="log_file"]'), data_loaded);

	start_vr_scene();
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
	// window.console.info(scene);

	const camera = document.querySelector('a-entity[camera]');
	// window.console.info(camera);

	//	Ground Plane Grid
	const ground_plane = document.createElement('a-entity');
	ground_plane.setAttribute('ground_plane', {'count': 150, 'gap': 1, 'size': 0.025});
	ground_plane.setAttribute('position', '0 -1.5 0');
	ground_plane.object3D.rotation.x += (-90 * (Math.PI / 180));
	scene.appendChild(ground_plane);

	//	Test container
	// const group = document.createElement('a-entity');
	// group.setAttribute('id', 'monkey');
	// scene.appendChild(group);

	//	Add test text
	// const text = document.createElement('a-entity');
	// text.setAttribute('id', 'test_text');
	// text.setAttribute('position', '0 0 -10');
	// text.setAttribute('text', {
	// 	'width': 2,
	// 	'color': 'red',
	// 	'value': 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam'
	// });
	// scene.appendChild(text);

	//	Monkey for grip/rotate test
	// const monkey = document.createElement('a-entity');
	// monkey.setAttribute('position', '0 0 0');
	// monkey.setAttribute('gltf-model', 'url(/assets/monkey.gltf)');
	// monkey.setAttribute('id', 'monkey');
	// group.appendChild(monkey);

	//	TEST
	// const hand_controls_left = document.createElement('a-entity');
	const hand_controls_left = document.createElement('a-entity');
	const hand_controls_right = document.createElement('a-entity');

	hand_controls_left.setAttribute('oculus-touch-controls', {'hand': 'left'});
	hand_controls_right.setAttribute('oculus-touch-controls', {'hand': 'right'});
	hand_controls_left.setAttribute('id', 'left_hand');
	hand_controls_right.setAttribute('id', 'right_hand');

	// hand_controls_right.setAttribute('super-hands', '');
	// hand_controls_right.setAttribute('sphere-collider', {'objects': 'a-box'});

	// hand_controls_left.setAttribute('hand-controls', {'hand': 'left'});
	// hand_controls_right.setAttribute('hand-controls', {'hand': 'right'});

	scene.appendChild(hand_controls_left);
	scene.appendChild(hand_controls_right);

	// hand_controls_right.addEventListener('gripdown', function (event) {
	// 	// var monkey = document.querySelector('#monkey');
	// 	// var quaternion = event.target.object3D.quaternion;
	// 	// window.console.info('griptouchend A', event, event.target.object3D.quaternion);
	// 	// window.console.info('griptouchend B', monkey.object3D);
	// 	// window.console.info('griptouchend', event);
	// 	// monkey.object3D.setRotationFromQuaternion(quaternion);

	// 	window.test_tick();
		
	// });

	// hand_controls_left.addEventListener('gripdown', function (event) {
	// 	window.console.info('gripdown', event);
	// 	document.querySelector('#monkey').setAttribute('grabbable', '');
	// });

	// hand_controls_left.addEventListener('gripup', function (event) {
	// 	window.console.info('gripup', event);
	// 	document.querySelector('#monkey').removeAttribute('grabbable');
	// });
	

	// window.console.info(hand_controls_left);
	// window.console.info(hand_controls_right);
	// <a-entity hand-controls="left"></a-entity>
	// <a-entity hand-controls="right"></a-entity>

	// <a-entity oculus-touch-controls="hand: left"></a-entity>
	// <a-entity oculus-touch-controls="hand: right"></a-entity>
}

function data_input($input, callback) {
	window.console.log('data_input');

	window.starting_time = Date.now();

	$input.on('change', function (event) {
		const fileReader = new FileReader();
		fileReader.onload = function () {
			callback(window.atob(fileReader.result.split(',')[1]).replace(/"/g, ''));
		};
		fileReader.readAsDataURL($input.prop('files')[0]);
	});
}

function data_loaded(csv) {
	window.console.log('data_loaded');

	//	TEMP: Hard-code the device profile
	//	TODO: Provide a selector widget
	const device_profile = references.device('RaceCapture/Pro MK3');

	//	Process all of the newly loaded data
	new Promise((resolve, reject) => {
		
		let csv_parser_message = function (event) {
			const message = JSON.parse(event.data);

			switch (message.command) {
				case 'data':
					resolve({ 'data': message.data.data });
					break;
				case 'terminate':
					utilities.clean_up_worker(workers.csv_parser, csv_parser_message, 'message');
					break;
			}
		}

		workers.csv_parser.addEventListener('message', csv_parser_message);
		workers.csv_parser.postMessage(JSON.stringify({ 'command': 'start', 'csv': csv }));

	}).then(function(values) {

		return new Promise((resolve, reject) => {

			let formatter_message = function (event) {
				const message = JSON.parse(event.data);

				switch (message.command) {
					case 'points':
						resolve({
							'points': message.points,
							'bounds_coords': message.bounds_coords,
							'vector_to_center': message.vector_to_center,
							'lap_boundaries': message.lap_boundaries
						});
						break;
					case 'terminate':
						utilities.clean_up_worker(workers.formatter, formatter_message, 'message');
						break;
				}
			}

			workers.formatter.addEventListener('message', formatter_message);
			workers.formatter.postMessage(JSON.stringify({ 'command': 'start', 'data': values.data, 'device_profile': device_profile }));
		});

	}).then(function(values) {
		render_racing_line(values.points, values.bounds_coords, values.vector_to_center, values.lap_boundaries);
	});
}

function render_racing_line(racing_line_points, bounds_coords, vector_to_center, lap_boundaries) {
	window.console.log('render_racing_line');

	//	TODO: Set dynamically/allow user input?
	const scaling_factor =			0.01;

	//	Select and create elements
	const scene =					document.querySelector('a-scene');
	const racing_line =				document.createElement('a-entity');
	const raw_line =				document.createElement('a-entity');
	// const smoothed0_points =		document.createElement('a-entity');
	// const smoothed1_points =		document.createElement('a-entity');
	// const smoothed2_points =		document.createElement('a-entity');
	// const smoothed3_points =		document.createElement('a-entity');
	// const smoothed4_points =		document.createElement('a-entity');
	// const smoothed5_points =		document.createElement('a-entity');
	// const smoothing_inspector =		document.createElement('a-entity');

	//	Place the racing line in the scene
	racing_line.appendChild(raw_line);
	scene.appendChild(racing_line);
	// scene.appendChild(smoothed0_points);
	// scene.appendChild(smoothed1_points);
	// scene.appendChild(smoothed2_points);
	// scene.appendChild(smoothed3_points);
	// scene.appendChild(smoothed4_points);
	// scene.appendChild(smoothed5_points);
	// scene.appendChild(smoothing_inspector);

	//	TODO: Replace with swizzle function to set correct Z?
	racing_line.object3D.rotation.x += (-90 * (Math.PI / 180));
	racing_line.setAttribute('scale', (scaling_factor + ' ' + scaling_factor + ' ' + scaling_factor));
	racing_line.setAttribute('position', '0.0 1.0 -1.0');
	racing_line.setAttribute('id', 'racing_line');

	raw_line.setAttribute('position', '0.0 0.0 -1.0');

	//	Parse the log data, and extract the lap boundaries
	// const racing_line_points =		parser.racing_line_points(data, device_profile);
	// const lap_boundaries =			parser.laps(racing_line_points);

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

	//	Assign the racing line component to the raw and smoother line entities
	raw_line.setAttribute('racing_line', {
		coords: '',
		length: second_lap_test.length,
		reorientation_quaternion: parser.vector_to_string(reorientation_quaternion)
	});

	//	Draw raw GPS racing line
	let grapher_message = function (event) {
		const message = JSON.parse(event.data);

		switch (message.command) {
			case 'point':
				let coords = raw_line.getAttribute('racing_line').coords;

				coords = _.concat(coords, message.points);
				coords = coords.map(AFRAME.utils.coordinates.stringify);
				coords = coords.join(', ');
				raw_line.setAttribute('racing_line', 'coords', coords);

				break;
			case 'terminate':
				utilities.clean_up_worker(workers.grapher, grapher_message, 'message');

				//	TODO: Should probably wrap this all up in a big fat promise
				render_smoothed_line(second_lap_test, v3_to_center, reorientation_quaternion);

				break;
		}
	}

	workers.grapher.addEventListener('message', grapher_message);
	workers.grapher.postMessage(JSON.stringify({
		'command': 'start',
		'data': second_lap_test,
		'floor_path': 'coordinates.cartesian.raw',
		'steps': 25,
		'value_function': graphs.line.name
	}));
}

function render_smoothed_line(lap_points, up_vector, reorientation_quaternion) {
	window.console.log('render_smoothed_line');

	const racing_line = document.querySelector('#racing_line');
	const smoothed_line = document.createElement('a-entity');

	racing_line.appendChild(smoothed_line);

	//	Assign the smoothed line component
	smoothed_line.setAttribute('racing_line', {
		coords: '',
		length: lap_points.length,
		reorientation_quaternion: parser.vector_to_string(reorientation_quaternion),
		colour: '#FF66FF'
	});

	//	Run smoothing algorithm on current lap
	let smoother_message = function (event) {
		const message = JSON.parse(event.data);

		switch (message.command) {
			case 'point':
				const smoothed_points = message.points;

				let coords = smoothed_line.getAttribute('racing_line').coords;
				coords = _.concat(coords, smoothed_points);
				coords = coords.map(AFRAME.utils.coordinates.stringify);
				coords = coords.join(', ');
				smoothed_line.setAttribute('racing_line', 'coords', coords);

				//	Update the existing dataset
				for (let index = 0, length = smoothed_points.length; index < length; index++) {
					_.set(lap_points, '[' + (_.get(message, 'index', 0) + index) + '].coordinates.cartesian.smoothed', smoothed_points[index]);
				}

				break;
			case 'terminate':
				utilities.clean_up_worker(workers.smoother, smoother_message, 'message');

				//	TODO: Should probably wrap this all up in a big fat promise
				render_graphs(lap_points, up_vector, reorientation_quaternion);

				break;
		}
	}
	workers.smoother.addEventListener('message', smoother_message);
	workers.smoother.postMessage(JSON.stringify({
		'command': 'start',
		'data': lap_points,
		'bounds': [320, 160, 80, 40, 20],
		'weights': [0.03, 0.07, 0.9],
		'steps': 50
	}));

	//	Compute the smoothed racing line
	// window.addEventListener('smoothed', function (event) {
	// 	let coords = smoothed_line.getAttribute('racing_line').coords;
	// 	coords.push(event.detail.point);
	// 	coords = coords.map(AFRAME.utils.coordinates.stringify);
	// 	coords = coords.join(', ');
	// 	smoothed_line.setAttribute('racing_line', 'coords', coords);
	// }, false);
	// parser.smooth(lap_points, [320, 160, 80, 40, 20], [0.03, 0.07, 0.9], false, 15, window, 'smoothed');

	// smoothed0_points.setAttribute('racing_dots', {
	// 	coords: parser.coords_to_string(smoothed_points[0]),
	// 	reorientation_quaternion: parser.vector_to_string(reorientation_quaternion),
	// 	colour: '#880000'
	// });

	// smoothed1_points.setAttribute('racing_dots', {
	// 	coords: parser.coords_to_string(smoothed_points[1]),
	// 	reorientation_quaternion: parser.vector_to_string(reorientation_quaternion),
	// 	colour: '#BB0044'
	// });

	// smoothed2_points.setAttribute('racing_dots', {
	// 	coords: parser.coords_to_string(smoothed_points[2]),
	// 	reorientation_quaternion: parser.vector_to_string(reorientation_quaternion),
	// 	colour: '#FF0088'
	// });

	// smoothed3_points.setAttribute('racing_dots', {
	// 	coords: parser.coords_to_string(smoothed_points[3]),
	// 	reorientation_quaternion: parser.vector_to_string(reorientation_quaternion),
	// 	colour: '#FF44BB'
	// });

	// smoothed4_points.setAttribute('racing_dots', {
	// 	coords: parser.coords_to_string(smoothed_points[4]),
	// 	reorientation_quaternion: parser.vector_to_string(reorientation_quaternion),
	// 	colour: '#FF88FF'
	// });

	// smoothed5_points.setAttribute('racing_dots', {
	// 	coords: parser.coords_to_string(smoothed_points[5]),
	// 	reorientation_quaternion: parser.vector_to_string(reorientation_quaternion),
	// 	colour: '#FFFFFF'
	// });

	// smoothing_inspector.setAttribute('smoothing_inspector', {
	// 	coords0: parser.coords_to_string(smoothed_points[0]),
	// 	coords1: parser.coords_to_string(smoothed_points[1]),
	// 	coords2: parser.coords_to_string(smoothed_points[2]),
	// 	coords3: parser.coords_to_string(smoothed_points[3]),
	// 	coords4: parser.coords_to_string(smoothed_points[4]),
	// 	coords5: parser.coords_to_string(smoothed_points[5]),
	// 	reorientation_quaternion: parser.vector_to_string(reorientation_quaternion)
	// });
}

function render_graphs(lap_points, up_vector, reorientation_quaternion) {
	window.console.log('render_graphs');

	const racing_line = document.querySelector('#racing_line');
	const graphed_line = document.createElement('a-entity');

	racing_line.appendChild(graphed_line);

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
	let grapher_message = function (event) {
		const message = JSON.parse(event.data);

		switch (message.command) {
			case 'point':
				const value_points = message.points.values;
				const floor_points = message.points.floors;

				//	"Grow" the graphed line
				let filled_coords = graphed_line.getAttribute('filled_graph').coords;
				let line_coords = graphed_line.getAttribute('line_graph').coords;

				//	Set the order of the points for the filled surface
				const ordered_points = [];
				for (let index = 0, length = value_points.length; index < length; index++) {
					ordered_points.push(floor_points[index]);
					ordered_points.push(value_points[index]);
				}

				filled_coords = _.concat(filled_coords, ordered_points);
				filled_coords = filled_coords.map(AFRAME.utils.coordinates.stringify);
				filled_coords = filled_coords.join(', ');

				line_coords = _.concat(line_coords, value_points);
				line_coords = line_coords.map(AFRAME.utils.coordinates.stringify);
				line_coords = line_coords.join(', ');

				graphed_line.setAttribute('filled_graph', 'coords', filled_coords);
				graphed_line.setAttribute('line_graph', 'coords', line_coords);

				break;
			case 'terminate':
				utilities.clean_up_worker(workers.grapher, grapher_message, 'message');
				break;
		}
	}

	workers.grapher.addEventListener('message', grapher_message);
	workers.grapher.postMessage(JSON.stringify({
		'command': 'start',
		'data': lap_points,
		'floor_path': 'coordinates.cartesian.smoothed',
		'value_path': 'performance.speed',
		'scale': 0.25,
		'steps': 50,
		'offset_vector_coords': { 'x': up_vector.x, 'y': up_vector.y, 'z': up_vector.z },
		'value_function': graphs.offset_fill.name
	}));
}

//	Start the Application
$(document).ready(function() {
	start_aframe(start_web_ui, start_vr_ui, exit_vr_ui);
});