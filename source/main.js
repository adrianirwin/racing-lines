//	Libraries
import * as _ from 'lodash';
import * as parser from './parser';
import * as references from './references';
import * as AFRAME from 'aframe';

//	Custom A-Frame Components
import './aframe/components';

//	Web Workers
import CSV_Parser from './workers/csv.js';
import Smoother from './workers/smoother.js';

//	Styles
import './styles/main.scss';


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

	$input.on('change', function (event) {
		const fileReader = new FileReader();
		fileReader.onload = function () {

			let csv_parser = CSV_Parser();
			let csv_parser_message = function (event) {
				const command = _.get(event, 'data.command', '');
				switch (command) {
					case 'data':
						const data = _.get(event, 'data.data.data', []);
						csv_parser.removeEventListener('message', csv_parser_message);
						csv_parser.terminate();
						csv_parser = undefined;
						csv_parser_message = undefined;
						callback(data);
				}
			}

			csv_parser.addEventListener('message', csv_parser_message);
			csv_parser.postMessage({ 'command': 'start', 'csv': window.atob(fileReader.result.split(',')[1]).replace(/"/g, '') });
		};
		fileReader.readAsDataURL($input.prop('files')[0]);
	});
}

function data_loaded(data) {
	window.console.log('data_loaded');

	//	Select and create elements
	const scene =					document.querySelector('a-scene');
	const racing_line =				document.createElement('a-entity');
	const smoothed0_line =			document.createElement('a-entity');
	// const smoothed0_points =		document.createElement('a-entity');
	// const smoothed1_points =		document.createElement('a-entity');
	// const smoothed2_points =		document.createElement('a-entity');
	// const smoothed3_points =		document.createElement('a-entity');
	// const smoothed4_points =		document.createElement('a-entity');
	// const smoothed5_points =		document.createElement('a-entity');
	// const smoothing_inspector =		document.createElement('a-entity');

	//	Place the racing line in the scene
	scene.appendChild(racing_line);
	scene.appendChild(smoothed0_line);
	// scene.appendChild(smoothed0_points);
	// scene.appendChild(smoothed1_points);
	// scene.appendChild(smoothed2_points);
	// scene.appendChild(smoothed3_points);
	// scene.appendChild(smoothed4_points);
	// scene.appendChild(smoothed5_points);
	// scene.appendChild(smoothing_inspector);

	//	TEMP: Hard-code the device profile
	//	TODO: Provide a selector widget
	const device_profile =			references.device('RaceCapture/Pro MK3');

	//	Parse the log data, and extract the lap boundaries
	const racing_line_points =		parser.racing_line_points(data, device_profile);
	const lap_boundaries =			parser.laps(racing_line_points);

	//	Re-center the racing line data
	const bounds_coords =			parser.bounds(racing_line_points);
	const vector_to_center =		parser.vector_to_center(bounds_coords);
	const vector_to_north_pole =	parser.vector_to_north_pole();
									parser.cartesian(racing_line_points);
									parser.recenter(racing_line_points, vector_to_center[0], vector_to_center[1], vector_to_center[2]);

	//	Trim the data to speed up development
	const first_lap =				racing_line_points.slice(0, lap_boundaries[0]);
	const first_lap_test =			racing_line_points.slice(0, lap_boundaries[0]);
	const second_lap_test =			racing_line_points.slice(lap_boundaries[1], lap_boundaries[2]);

	//	Smooth the raw cartesian points
	// window.addEventListener('smoothed', function (event) {
	// 	window.console.info(Date.now(), 'smoothed', (event.detail.index + '/' + event.detail.length));
	// }, false);
	// 								parser.smooth(first_lap_test, [320, 160, 80, 40, 20], [0.03, 0.07, 0.9], false, 50, window, 'smoothed');
	// const smoothed_points = 		parser.smooth(first_lap, [320, 160, 80, 40, 20], [0.03, 0.07, 0.9], true);

	//	Vector to offset subsequent laps by
	//	NOTE: Only visible if more than one lap is being rendered
	const lap_offset_vector =		new THREE.Vector3(vector_to_center[0], vector_to_center[1], vector_to_center[2]).normalize();

	//	Three significant vectors
	//	 - to the center of the track bounds in earth space
	//	 - to the north pole ('up') in earth space
	//	 - cross product along which to rotate to translate from one to the other
	const v3_to_center =			new THREE.Vector3(vector_to_center[0], vector_to_center[1], vector_to_center[2]);
	const v3_to_north_pole =		new THREE.Vector3(vector_to_north_pole[0], vector_to_north_pole[1], vector_to_north_pole[2]);
	var v3_cross =					new THREE.Vector3(0, 0, 0);

	//	Compute the cross product
	v3_cross.crossVectors(v3_to_center, v3_to_north_pole);
	v3_cross.normalize();

	//	Angle of the rotation to re-orient 'up'
	const angle =					v3_to_center.angleTo(v3_to_north_pole);

	//	Quaternion describing the rotation
	var quaternion =				new THREE.Quaternion();
	quaternion.setFromAxisAngle(v3_cross, angle);

	//	Assign data to the racing line
	racing_line.setAttribute('racing_line', {
		// coords: parser.coords_to_string(first_lap, 'coordinates.cartesian.raw'),
		coords: parser.coords_to_string(second_lap_test, 'coordinates.cartesian.raw'),
		lap_boundaries: parser.laps_to_string(lap_boundaries),
		lap_offset_vector: parser.vector_to_string(lap_offset_vector),
		reorientation_quaternion: parser.vector_to_string(quaternion)
	});

	smoothed0_line.setAttribute('racing_line', {
		// coords: parser.coords_to_string(first_lap, 'coordinates.cartesian.smoothed'),
		coords: '',
		lap_offset_vector: parser.vector_to_string(lap_offset_vector),
		length: second_lap_test.length,
		reorientation_quaternion: parser.vector_to_string(quaternion),
		colour: '#FF66FF'
	});


	let smoother = new Smoother();
	let smoother_message = function (event) {
		const command = _.get(event, 'data.command', '');
		switch (command) {
			case 'point':
				let coords = smoothed0_line.getAttribute('racing_line').coords;
				coords.push(event.data.point);
				coords = coords.map(AFRAME.utils.coordinates.stringify);
				coords = coords.join(', ');
				smoothed0_line.setAttribute('racing_line', 'coords', coords);
				break;
			case 'terminate':
				smoother.removeEventListener('message', smoother_message);
				smoother.terminate();
				smoother = undefined;
				smoother_message = undefined;
		}
	}

	smoother.addEventListener('message', smoother_message);
	smoother.postMessage({ 'command': 'start', 'data': second_lap_test, 'bounds': [320, 160, 80, 40, 20], 'weights': [0.03, 0.07, 0.9] });

	//	Compute the smoothed racing line
	// window.addEventListener('smoothed', function (event) {
	// 	let coords = smoothed0_line.getAttribute('racing_line').coords;
	// 	coords.push(event.detail.point);
	// 	coords = coords.map(AFRAME.utils.coordinates.stringify);
	// 	coords = coords.join(', ');
	// 	smoothed0_line.setAttribute('racing_line', 'coords', coords);
	// }, false);
	// parser.smooth(second_lap_test, [320, 160, 80, 40, 20], [0.03, 0.07, 0.9], false, 15, window, 'smoothed');

	// smoothed0_points.setAttribute('racing_dots', {
	// 	coords: parser.coords_to_string(smoothed_points[0]),
	// 	reorientation_quaternion: parser.vector_to_string(quaternion),
	// 	colour: '#880000'
	// });

	// smoothed1_points.setAttribute('racing_dots', {
	// 	coords: parser.coords_to_string(smoothed_points[1]),
	// 	reorientation_quaternion: parser.vector_to_string(quaternion),
	// 	colour: '#BB0044'
	// });

	// smoothed2_points.setAttribute('racing_dots', {
	// 	coords: parser.coords_to_string(smoothed_points[2]),
	// 	reorientation_quaternion: parser.vector_to_string(quaternion),
	// 	colour: '#FF0088'
	// });

	// smoothed3_points.setAttribute('racing_dots', {
	// 	coords: parser.coords_to_string(smoothed_points[3]),
	// 	reorientation_quaternion: parser.vector_to_string(quaternion),
	// 	colour: '#FF44BB'
	// });

	// smoothed4_points.setAttribute('racing_dots', {
	// 	coords: parser.coords_to_string(smoothed_points[4]),
	// 	reorientation_quaternion: parser.vector_to_string(quaternion),
	// 	colour: '#FF88FF'
	// });

	// smoothed5_points.setAttribute('racing_dots', {
	// 	coords: parser.coords_to_string(smoothed_points[5]),
	// 	reorientation_quaternion: parser.vector_to_string(quaternion),
	// 	colour: '#FFFFFF'
	// });

	// smoothing_inspector.setAttribute('smoothing_inspector', {
	// 	coords0: parser.coords_to_string(smoothed_points[0]),
	// 	coords1: parser.coords_to_string(smoothed_points[1]),
	// 	coords2: parser.coords_to_string(smoothed_points[2]),
	// 	coords3: parser.coords_to_string(smoothed_points[3]),
	// 	coords4: parser.coords_to_string(smoothed_points[4]),
	// 	coords5: parser.coords_to_string(smoothed_points[5]),
	// 	reorientation_quaternion: parser.vector_to_string(quaternion)
	// });

	//	TODO: Replace with swizzle function to set correct Z?
	racing_line.object3D.rotation.x += (-90 * (Math.PI / 180));
	smoothed0_line.object3D.rotation.x += (-90 * (Math.PI / 180));
	// smoothed0_points.object3D.rotation.x += (-90 * (Math.PI / 180));
	// smoothed1_points.object3D.rotation.x += (-90 * (Math.PI / 180));
	// smoothed2_points.object3D.rotation.x += (-90 * (Math.PI / 180));
	// smoothed3_points.object3D.rotation.x += (-90 * (Math.PI / 180));
	// smoothed4_points.object3D.rotation.x += (-90 * (Math.PI / 180));
	// smoothed5_points.object3D.rotation.x += (-90 * (Math.PI / 180));
	// smoothing_inspector.object3D.rotation.x += (-90 * (Math.PI / 180));

	racing_line.setAttribute('position', '0.0 0.99 -1.0');
	smoothed0_line.setAttribute('position', '0.0 1.0 -1.0');
	racing_line.setAttribute('scale', '0.01 0.01 0.01');
	smoothed0_line.setAttribute('scale', '0.01 0.01 0.01');
}

async function data_processing() {
	window.console.log('data_processing');

	parser.smooth(first_lap, [320, 160, 80, 40, 20], [0.03, 0.07, 0.9]);
}

//	Start the Application
$(document).ready(function() {
	start_aframe(start_web_ui, start_vr_ui, exit_vr_ui);
});