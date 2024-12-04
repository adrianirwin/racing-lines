import { Coordinate } from './Geometry'

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

// TODO: This name sucks
export interface LoadedValues {
	bounds_coords: Coordinate.GeographicBounds
	lap_boundaries: Array<number>
	points: Array<RacingLinePoint>
	vector_to_center: Array<number>
}
