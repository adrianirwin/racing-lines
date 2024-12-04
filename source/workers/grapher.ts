import get from 'lodash/get'
import isString from 'lodash/isString'
import map from 'lodash/map'
import { Coordinate } from './../models/Geometry'
import { RacingLinePoint } from './../models/Logs'
import { WebWorker } from './../models/Workers'
import * as util_graphing from './../utilities/graphing'

self.addEventListener('message', (event: MessageEvent): void => {
	const message: {
		command: string,
		index: number,
		points: Array<RacingLinePoint>,
		value_function: string,
		offset_vector_coords?: Coordinate.Cartesian3D,
		path_floor?: string,
		path_value?: string,
		path_delta?: string,
		scale?: number,
		steps?: number,
	} = JSON.parse(event.data)

	// @ts-ignore
	const value_function = util_graphing[message.value_function] // as (floor_points: any, values: any, deltas: any, index: any, scale: any, steps: any, offset_vector_coords: any) => Array<Coordinate.Cartesian3D>

	switch (message.command) {
		case WebWorker.Task.GraphPointsFinished:
			self.postMessage(JSON.stringify({
				command:			WebWorker.Task.Terminate,
			}))
			break

		case WebWorker.Task.GraphPointsBatch:
			self.postMessage(JSON.stringify({
				command:		WebWorker.Task.PointsGraphed,
				points:			value_function(
									map(message.points, message.path_floor),
									map(message.points, message.path_value || ''),
									map(message.points, message.path_delta || ''),
									message.index, // TODO: No longer needed here
									message.scale || 1.0,
									message.steps,
									message.offset_vector_coords || { x: 0, y: 0, z: 1 }
								),
				index:			message.index,
			}))
			break
	}
})
