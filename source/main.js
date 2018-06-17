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

function start_web() {
	window.console.log('start_web');

	data_input($('input[name="log_file"]'), data_loaded);
}

function data_input($input, callback) {
	window.console.log('data_input');

	$input.on('change', function (event) {
		const fileReader = new FileReader();
		fileReader.onload = function () {
			//	This is pretty heinous
			callback(parser.from_csv(window.atob(fileReader.result.substr(13)).replace(/"/g, '')).data);
		};
		fileReader.readAsDataURL($input.prop('files')[0]);
	});
}

function data_loaded(data) {
	window.console.log('data_loaded');

	const cartesian_coords = parser.cartesian(parser.gps(data));
	const recentered_coords = parser.recenter(cartesian_coords, 1527627, 3498173, -5092639);

	const sceneEl = document.querySelector('a-scene');
	const entityEl = document.createElement('a-entity');
	entityEl.setAttribute('racing_line', 'coords: ' + parser.to_string(recentered_coords));
	sceneEl.appendChild(entityEl);
}

//	Start the Application
$(document).ready(function() {
	start_aframe(start_web);
});