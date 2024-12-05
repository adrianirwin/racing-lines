import { Coordinate } from './Geometry'

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
		vector_to_center: Array<number>
	}

	export class Session implements File, ParsedValues {
		processing: boolean

		//	Log.File
		name: string
		last_modified: number

		//	Log.ParsedValues
		bounds_coords: Coordinate.GeographicBounds
		lap_first_point_indexes: Array<number>
		points: Array<RacingLinePoint>
		vector_to_center: Array<number>

		constructor(file: File, parsed_values: ParsedValues) {
			this.processing = false

			this.last_modified = file.last_modified
			this.name = file.name

			this.bounds_coords = parsed_values.bounds_coords
			this.lap_first_point_indexes = parsed_values.lap_first_point_indexes
			this.points = parsed_values.points
			this.vector_to_center = parsed_values.vector_to_center
		}

		get total_laps(): number {
			return this.lap_first_point_indexes.length
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
