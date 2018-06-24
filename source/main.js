import * as _ from 'lodash';
import * as parser from './parser';
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

	//	Place the racing line in the scene
	scene.appendChild(racing_line);

	//	Parse the lat/long data, extract cartesian coordinates, and recenter them around the origin
	const gps_coords =				parser.gps(data);
	const bounds_coords =			parser.bounds(gps_coords);
	const vector_to_center =		parser.vector_to_center(bounds_coords);
	const vector_to_north_pole =	parser.vector_to_north_pole();
	const cartesian_coords =		parser.cartesian(gps_coords);
	const recentered_coords =		parser.recenter(cartesian_coords, vector_to_center[0], vector_to_center[1], vector_to_center[2]);

	//	Parse the lap boundaries
	const lap_boundaries =			parser.laps(data);
	const lap_offset_vector =		new THREE.Vector3(vector_to_center[0], vector_to_center[1], vector_to_center[2]).normalize();
	window.console.log(lap_boundaries);

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
		coords: parser.coords_to_string(recentered_coords),
		lap_boundaries: parser.laps_to_string(lap_boundaries),
		lap_offset_vector: parser.vector_to_string(lap_offset_vector),
		reorientation_quaternion: parser.vector_to_string(quaternion)
	});

	//	TODO: Replace with swizzle function to set correct Z
	racing_line.object3D.rotation.x += (90 * (Math.PI / 180));
}

//	Start the Application
$(document).ready(function() {
	start_aframe(start_web_ui);
});