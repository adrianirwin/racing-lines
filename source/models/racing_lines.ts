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