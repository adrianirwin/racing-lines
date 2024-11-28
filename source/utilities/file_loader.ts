import {
	LoadedValues,
	RacingLinePoint,
} from './../models/racing_lines'

//	Parse the CSV file into:
//	- Object of points with performance and GPS data
//	- Object of lat/long coordinates representing the outer boundaries of the GPS points
//	- Object representing a vector to the center of the track from the center of the earth
//	- Array of indicies indicating which points are lap boundaries
function parse_file(worker: Worker, files: FileList | null, callback: Function): void {

	//	Process all of the newly loaded data
	new Promise((resolve, reject) => {

		const values: LoadedValues = {
			points: new Array<RacingLinePoint>(),
			bounds_coords: {
				latitude_northmost: 0,
				latitude_southmost: 0,
				longitude_eastmost: 0,
				longitude_westmost: 0,
			},
			vector_to_center: new Array<number>(),
			lap_boundaries: new Array<number>(),
		}

		let parsed_message = null
		let worker_message = function (event: MessageEvent): void {
			parsed_message = JSON.parse(event.data)

			switch (parsed_message.command) {
				case 'metadata':
					values.bounds_coords = parsed_message.bounds_coords
					values.vector_to_center = parsed_message.vector_to_center
					values.lap_boundaries = parsed_message.lap_boundaries
					break

				case 'points':
					values.points = values.points.concat(parsed_message.points)
					break

				case 'terminate':
					parsed_message = undefined

					resolve(values)
					worker.removeEventListener('message', worker_message)
					break
			}
		}

		worker.addEventListener('message', worker_message)
		worker.postMessage(files)

	}).then(function(values) {
		callback(values)
	})
}

//	Add a listener listening for the onChange event on a <input type="file"> element
export function add_listener(worker: Worker, input: HTMLInputElement, callback: Function): void {
	input.addEventListener('change', function handle_change() {
		input.removeEventListener('change', handle_change)
		parse_file(worker, input.files, callback)
		input.value = ''
	})
}
