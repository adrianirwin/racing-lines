import { Coordinate } from './../models/Geometry'
import {
	Log,
	RacingLinePoint,
} from './../models/Logs'
import { WebWorker } from './../models/Workers'

//	Parse the CSV file into:
//	- Object of points with performance and GPS data
//	- Object of lat/long coordinates representing the outer boundaries of the GPS points
//	- Object representing a vector to the center of the track from the center of the earth
//	- Array of indicies indicating which points are lap boundaries
function parse_file(worker: Worker, files: FileList | null, callback: (session: Log.Session) => void): void {

	const file: Log.File = {
		last_modified: files?.item(0)?.lastModified ?? NaN,
		name: files?.item(0)?.name ?? '',
	}

	//	Process all of the newly loaded data
	new Promise((resolve: (session: Log.Session) => void, reject) => {

		const values: Log.ParsedValues = {
			points: new Array<RacingLinePoint>(),
			bounds_coords: <Coordinate.GeographicBounds>{
				latitude_northmost: NaN,
				latitude_southmost: NaN,
				longitude_eastmost: NaN,
				longitude_westmost: NaN,
			},
			vector_to_center: new Array<number>(),
			lap_first_point_indexes: new Array<number>(),
		}

		let parsed_message: (Log.ParsedValues & { command: string }) | null = null
		const worker_message_callback = (event: MessageEvent): void => {
			parsed_message = JSON.parse(event.data) as (Log.ParsedValues & { command: string })

			switch (parsed_message.command) {
				case WebWorker.Task.LogFileMetadataParsed:
					values.bounds_coords = parsed_message.bounds_coords
					values.vector_to_center = parsed_message.vector_to_center
					values.lap_first_point_indexes = parsed_message.lap_first_point_indexes
					break

				case WebWorker.Task.LogFilePointsParsed:
					values.points = values.points.concat(parsed_message.points)
					break

				case WebWorker.Task.Terminate:
					parsed_message = null

					resolve(new Log.Session(file, values))
					worker.removeEventListener('message', worker_message_callback)
					break
			}
		}

		worker.addEventListener('message', worker_message_callback)
		worker.postMessage(files)

	}).then((session: Log.Session): void => {
		callback(session)
	})
}

//	Add a listener listening for the onChange event on a <input type="file"> element
export function add_listener(worker: Worker, input: HTMLInputElement, callback: (session: Log.Session) => void): void {
	input.addEventListener('change', function handle_change() {
		input.removeEventListener('change', handle_change)
		parse_file(worker, input.files, callback)
		input.value = ''
	})
}
