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

interface Timing {
	interval: number
	utc: number
}

export enum WorkerTask {
	GraphPointsBatch = 'GRAPH_POINTS_BATCH',
	GraphPointsFinished = 'GRAPH_POINTS_FINISHED',
	LoadMetadata = 'LOAD_METADATA',
	LoadPointsBatch = 'LOAD_POINTS_BATCH',
	LoadPointsFinished = 'LOAD_POINTS_FINISHED',
	PointsGraphed = 'POINTS_GRAPHED',
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
	delta: {
		speed: number
	}
	diagnostics: {
		battery_voltage: number
		coolant_temperature: number
		oil_pressure: number
		oil_temperature: number
	}
	g: Coordinate.Cartesian3D
	performance: {
		current_lap: number
		speed: number
	}
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
