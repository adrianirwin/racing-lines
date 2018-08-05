import * as _ from 'lodash';
import * as parser from './parser';
import * as references from './references';
import * as aframe from 'aframe';
import './aframe/components';
import './styles/main.scss';

//	Add A-Frame's <a-scene> to start the scene
function start_aframe(callback) {
	window.console.log('start_aframe');

	$('body').append('<a-scene>');
	$('a-scene').on('loaded', callback);
}

function start_web_ui() {
	window.console.log('start_web_ui');

	data_input($('input[name="log_file"]'), data_loaded);
}

function data_input($input, callback) {
	window.console.log('data_input');

	$input.on('change', function (event) {
		const fileReader = new FileReader();
		fileReader.onload = function () {
			callback(parser.from_csv(window.atob(fileReader.result.split(',')[1]).replace(/"/g, '')).data);
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
	const smoothed0_points =		document.createElement('a-entity');
	const smoothed1_points =		document.createElement('a-entity');
	const smoothed2_points =		document.createElement('a-entity');
	const smoothed3_points =		document.createElement('a-entity');
	const smoothed4_points =		document.createElement('a-entity');
	const smoothed5_points =		document.createElement('a-entity');
	const smoothing_inspector =		document.createElement('a-entity');

	//	TEST
	const hand_controls_left =		document.createElement('a-entity');
	const hand_controls_right =		document.createElement('a-entity');
	scene.appendChild(hand_controls_left);
	scene.appendChild(hand_controls_right);

	hand_controls_left.setAttribute('laser-controls', {'hand': 'left'});
	hand_controls_right.setAttribute('laser-controls', {'hand': 'right'});
	// <a-entity hand-controls="left"></a-entity>
	// <a-entity hand-controls="right"></a-entity>

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

	//	Smooth the raw cartesian points
									parser.smooth(first_lap, [320, 160, 80, 40, 20], [0.03, 0.07, 0.9]);
	const smoothed_points = 		parser.smooth(first_lap, [320, 160, 80, 40, 20], [0.03, 0.07, 0.9], true);

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
		coords: parser.coords_to_string(first_lap, 'coordinates.cartesian.raw'),
		lap_boundaries: parser.laps_to_string(lap_boundaries),
		lap_offset_vector: parser.vector_to_string(lap_offset_vector),
		reorientation_quaternion: parser.vector_to_string(quaternion)
	});

	smoothed0_line.setAttribute('racing_line', {
		coords: parser.coords_to_string(first_lap, 'coordinates.cartesian.smoothed'),
		lap_offset_vector: parser.vector_to_string(lap_offset_vector),
		reorientation_quaternion: parser.vector_to_string(quaternion),
		colour: '#FF66FF'
	});

	smoothed0_points.setAttribute('racing_dots', {
		coords: parser.coords_to_string(smoothed_points[0]),
		reorientation_quaternion: parser.vector_to_string(quaternion),
		colour: '#880000'
	});

	smoothed1_points.setAttribute('racing_dots', {
		coords: parser.coords_to_string(smoothed_points[1]),
		reorientation_quaternion: parser.vector_to_string(quaternion),
		colour: '#BB0044'
	});

	smoothed2_points.setAttribute('racing_dots', {
		coords: parser.coords_to_string(smoothed_points[2]),
		reorientation_quaternion: parser.vector_to_string(quaternion),
		colour: '#FF0088'
	});

	smoothed3_points.setAttribute('racing_dots', {
		coords: parser.coords_to_string(smoothed_points[3]),
		reorientation_quaternion: parser.vector_to_string(quaternion),
		colour: '#FF44BB'
	});

	smoothed4_points.setAttribute('racing_dots', {
		coords: parser.coords_to_string(smoothed_points[4]),
		reorientation_quaternion: parser.vector_to_string(quaternion),
		colour: '#FF88FF'
	});

	smoothed5_points.setAttribute('racing_dots', {
		coords: parser.coords_to_string(smoothed_points[5]),
		reorientation_quaternion: parser.vector_to_string(quaternion),
		colour: '#FFFFFF'
	});

	smoothing_inspector.setAttribute('smoothing_inspector', {
		coords0: parser.coords_to_string(smoothed_points[0]),
		coords1: parser.coords_to_string(smoothed_points[1]),
		coords2: parser.coords_to_string(smoothed_points[2]),
		coords3: parser.coords_to_string(smoothed_points[3]),
		coords4: parser.coords_to_string(smoothed_points[4]),
		coords5: parser.coords_to_string(smoothed_points[5]),
		reorientation_quaternion: parser.vector_to_string(quaternion)
	});

	//	TODO: Replace with swizzle function to set correct Z?
	racing_line.object3D.rotation.x += (-90 * (Math.PI / 180));
	smoothed0_line.object3D.rotation.x += (-90 * (Math.PI / 180));
	smoothed0_points.object3D.rotation.x += (-90 * (Math.PI / 180));
	smoothed1_points.object3D.rotation.x += (-90 * (Math.PI / 180));
	smoothed2_points.object3D.rotation.x += (-90 * (Math.PI / 180));
	smoothed3_points.object3D.rotation.x += (-90 * (Math.PI / 180));
	smoothed4_points.object3D.rotation.x += (-90 * (Math.PI / 180));
	smoothed5_points.object3D.rotation.x += (-90 * (Math.PI / 180));
	smoothing_inspector.object3D.rotation.x += (-90 * (Math.PI / 180));
}

//	Start the Application
$(document).ready(function() {
	start_aframe(start_web_ui);
});