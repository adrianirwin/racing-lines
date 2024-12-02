export namespace Coordinate {
	export interface Geographic {
		latitude: number
		longitude: number
	}
	export interface GeographicBounds {
		latitude_northmost: number
		latitude_southmost: number
		longitude_eastmost: number
		longitude_westmost: number
	}
	export interface Orientation {
		pitch: number
		roll: number
		yaw: number
	}
	export interface Cartesian2D {
		x: number
		y: number
	}
	export interface Cartesian3D {
		x: number
		y: number
		z: number
	}
	export interface Quaternion {
		w: number
		x: number
		y: number
		z: number
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

export enum WorkerTask {
	GraphPointsBatch = 'GRAPH_POINTS_BATCH',
	GraphPointsFinished = 'GRAPH_POINTS_FINISHED',
	MetadataLoaded = 'METADATA_LOADED',
	PointsGraphed = 'POINTS_GRAPHED',
	PointsLoaded = 'POINTS_LOADED',
	PointsSmoothed = 'POINTS_SMOOTHER',
	SmoothPointsBatch = 'SMOOTH_POINTS_BATCH',
	SmoothPointsFinished = 'SMOOTH_POINTS_FINISHED',
	Terminate = 'TERMINATE',
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
