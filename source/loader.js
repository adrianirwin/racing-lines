//	Libraries
import * as utilities from './utilities';

//	Parse the CSV file into:
//	- Object of points with performance and GPS data
//	- Object of lat/long coordinates representing the outer boundaries of the GPS points
//	- Object representing a vector to the center of the track from the center of the earth
//	- Array of indicies indicating which points are lap boundaries
function parse_file( worker, files, callback) {

	//	Process all of the newly loaded data
	new Promise((resolve, reject) => {

		const values = {
			'points': [],
			'bounds_coords': {},
			'vector_to_center': [],
			'lap_boundaries': []
		};

		let parsed_message = null;
		let worker_message = function (event) {
			parsed_message = JSON.parse(event.data);

			switch (parsed_message.command) {
				case 'metadata':
					values.bounds_coords = parsed_message.bounds_coords,
					values.vector_to_center = parsed_message.vector_to_center,
					values.lap_boundaries = parsed_message.lap_boundaries
					break;

				case 'points':
					values.points = values.points.concat(parsed_message.points);
					break;

				case 'terminate':
					parsed_message = undefined;

					resolve(values);
					utilities.clean_up_worker(worker, worker_message, 'message');
					break;
			}
		}

		worker.addEventListener('message', worker_message);
		worker.postMessage(files);

	}).then(function(values) {
		callback(values);
	});
}

//	Add a listener listening for the onChange event on a <input type="file"> element
function add_listener(worker, input, callback) {
	input.addEventListener('change', function handle_change() {
		input.removeEventListener('change', handle_change);
		parse_file(worker, input.files, callback);
		input.value = null;
	});
}

export { add_listener };
