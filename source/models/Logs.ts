import { BehaviorSubject } from 'rxjs'
import { Coordinate } from './Geometry'
import { WebWorker } from './Workers'

export namespace Log {
	export interface File {
		last_modified: number
		name: string
	}

	// TODO: This name sucks
	export interface ParsedValues {
		bounds_coords: Coordinate.GeographicBounds
		lap_first_point_indexes: Array<number>
		points: Array<RacingLinePoint>
		vector_to_center: Coordinate.Cartesian3D
	}

	export class Session implements File, ParsedValues {
		$smoothing_progress: BehaviorSubject<number>
		$smoothed_up_to_lap: BehaviorSubject<number>

		//	Log.File
		name: string
		last_modified: number

		//	Log.ParsedValues
		bounds_coords: Coordinate.GeographicBounds
		lap_first_point_indexes: Array<number>
		points: Array<RacingLinePoint>
		vector_to_center: Coordinate.Cartesian3D

		constructor(file: File, parsed_values: ParsedValues) {
			this.$smoothing_progress = new BehaviorSubject(0.0)
			this.$smoothed_up_to_lap = new BehaviorSubject(0)

			this.last_modified = file.last_modified
			this.name = file.name

			this.bounds_coords = parsed_values.bounds_coords
			this.lap_first_point_indexes = parsed_values.lap_first_point_indexes
			this.points = parsed_values.points
			this.vector_to_center = parsed_values.vector_to_center

			//	Reduce the GPS sensor caused noise
			this.smooth_deltas(20)
			this.smooth_cartesian_coords([320, 160, 80, 40, 20], [0.03, 0.07, 0.9])
		}

		get total_laps(): number {
			return this.lap_first_point_indexes.length
		}

		// TODO: Need to check that it's **actually** a full lap, currently ignores the final lap...
		get fastest_lap(): number {
			let fastest_lap = 1
			let best_lap_time = this.time_for_lap(1)
			let curr_lap_time = this.time_for_lap(1)
			for (let i = 1, l = this.total_laps; i < l; i++) {
				curr_lap_time = this.time_for_lap(i)
				if (curr_lap_time < best_lap_time) {
					fastest_lap = i
					best_lap_time = curr_lap_time
				}
			}
			return fastest_lap
		}

		//	1-based convenience method to get the points for a lap
		points_for_lap(lap_number: number): Array<RacingLinePoint> {
			if (lap_number > 0 && lap_number <= this.lap_first_point_indexes.length) {
				return this.points.slice(
					this.lap_first_point_indexes[lap_number - 1],
					this.lap_first_point_indexes[lap_number],
				)
			}
			return new Array<RacingLinePoint>()
		}

		time_for_lap(lap_number: number): number {
			if (lap_number > 0 && lap_number <= this.lap_first_point_indexes.length) {
				return this.points[(this.lap_first_point_indexes[lap_number] ?? this.points.length) - 1].timing.utc - this.points[this.lap_first_point_indexes[lap_number - 1]].timing.utc
			}
			return NaN
		}

		time_for_lap_formatted(lap_number: number): string {
			const milliseconds = this.time_for_lap(lap_number)

			const totalSeconds = Math.floor(milliseconds / 1000);
			const hours = Math.floor(totalSeconds / 3600);
			const minutes = Math.floor((totalSeconds % 3600) / 60);
			const seconds = totalSeconds % 60;

			return String(minutes) + ':' + String(seconds).padStart(2, '0') + '.' + String(milliseconds).slice(-3).padStart(3, '0')
		}

		smooth_cartesian_coords(group_sizes: Array<number>, group_weights: Array<number>): void {
			const worker = new Worker(new URL('./../workers/cartesian_coords_smoother.js', import.meta.url))
			const points_l = this.points.length

			let smoothed_coords: Array<string> | null = null

			let parsed_message: {
				command: string,
				points: Array<Coordinate.Cartesian3D>,
				index: number,
			} | null = null

			const worker_message = (event: MessageEvent) => {
				parsed_message = JSON.parse(event.data)

				switch (parsed_message?.command) {
					case WebWorker.Task.PointsSmoothed:
						smoothed_coords = parsed_message.points.map(AFRAME.utils.coordinates.stringify)

						//	Update the existing dataset
						for (let i = 0, l = parsed_message.points.length; i < l; i++) {
							this.points[(parsed_message.index) + i].coordinates.cartesian.smoothed = parsed_message.points[i]
						}

						this.$smoothing_progress.next(parsed_message.index / points_l)
						this.$smoothed_up_to_lap.next(
							this.lap_first_point_indexes.findLastIndex((lap_first_point_index: number) => (parsed_message?.index ?? 0) > lap_first_point_index)
						)
						break

					case WebWorker.Task.Terminate:
						smoothed_coords = null
						parsed_message = null

						worker.removeEventListener('message', worker_message)

						this.$smoothing_progress.next(1.0)
						this.$smoothed_up_to_lap.next(this.total_laps)
						this.$smoothing_progress.complete()
						this.$smoothed_up_to_lap.complete()
						break
				}
			}
			worker.addEventListener('message', worker_message)

			//	Iteratively feed in the points to the smoothing worker
			let send_i = 0
			const step = 100

			const interval_id = window.setInterval(() => {
				if ((send_i * step) < points_l) {
					worker.postMessage(JSON.stringify({
						command:			WebWorker.Task.SmoothPointsBatch,
						bounds:				group_sizes,
						index:				(send_i * step),
						points:				this.points.slice(Math.max(((send_i * step) - group_sizes[0]), 0), (((send_i + 1) * step) + group_sizes[0])),
						start_offset:		Math.min((send_i * step), group_sizes[0]),
						steps:				step,
						weights:			group_weights,
					}))
					send_i++
				}
				else {
					window.clearInterval(interval_id)
					worker.postMessage(JSON.stringify({
						command:			WebWorker.Task.SmoothPointsFinished,
					}))
				}
			}, 1)
		}

		smooth_deltas(averaged_across: number): void {
			// TODO: Implement similar smoothing algorithm as the cartesian coords?
			const total_average_count = (averaged_across * 2 + 1)
			const surrounding_values = new Array<number>()
			this.points.forEach((point: RacingLinePoint, point_index: number): void => {
				for (let i = 0, l = total_average_count; i < l; i++) {
					surrounding_values[i] = this.points[(point_index + i - averaged_across)]?.delta.speed ?? 0
				}

				this.points[point_index].delta.speed = surrounding_values.reduce((accumulator: number, current: number): number => accumulator + current, 0) / total_average_count
			})
		}
	}
}

interface CarDiagnostics {
	battery_voltage: number
	coolant_temperature: number
	oil_pressure: number
	oil_temperature: number
}

interface Timing {
	interval: number
	utc: number
}

interface LapPerformance {
	current_lap: number
	speed: number
}

interface DeltaPerformance {
	speed: number
}

export namespace Device {
	export interface LogIndicies {
		gps: Coordinate.Geographic
		g: Coordinate.Cartesian3D
		rotation: Coordinate.Orientation
		timing: Timing
		performance: LapPerformance
		diagnostics: CarDiagnostics
	}
	export class LogIndicies {

	}
	export interface Profile {
		log_indicies: LogIndicies
	}
	export interface Profiles {
		[name: string]: Profile
	}
}

export interface RacingLinePoint {
	coordinates: {
		cartesian: {
			raw: Coordinate.Cartesian3D
			smoothed: Coordinate.Cartesian3D
		}
		gps: Coordinate.Geographic
	}
	delta: DeltaPerformance
	diagnostics: CarDiagnostics
	g: Coordinate.Cartesian3D
	performance: LapPerformance
	rotation: Coordinate.Orientation
	timing: Timing
}
