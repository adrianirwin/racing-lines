import { Coordinate } from './Geometry'
import { Log } from './Logs'

export namespace Schema {
	export type ArrayNumber = {
		type: string
		default: Array<number>
	}
	export type Colour = {
		type: string
		default: string
	}
	export type Coord = {
		type: string
		default: Coordinate.Cartesian3D
	}
	export type Coords = {
		parse: (value: string) => Array<Coordinate.Cartesian3D>
		default: Array<Coordinate.Cartesian3D>
	}
	export type Number = {
		type: string
		default: number
	}
	export type Quaternion = {
		type: string
		default: Coordinate.Quaternion
	}
	export type Session = {
		default: null
		parse: (value: Log.Session) => Log.Session
		stringify: (value: Log.Session) => string
	}
	export type String = {
		type: string
		default: string
	}

	export type ToDataTypeMapping<T> =
		T extends Schema.ArrayNumber ?		Array<number> :
		T extends Schema.Colour ?			string :
		T extends Schema.Coords ?			Array<Coordinate.Cartesian3D> :
		T extends Schema.Number ?			number :
		T extends Schema.Quaternion ?		Coordinate.Quaternion :
		T extends Schema.Session ?			Log.Session :
		T extends Schema.String ?			string :
		T extends Schema.Coord ?			Coordinate.Cartesian3D : // This has to come after Schema.Quaternion ¯\_(ツ)_/¯ (it could be duck-typing iteratively...)
		T

	export type ToData<T> = {
		[PropertyKey in keyof T]: ToDataTypeMapping<T[PropertyKey]>
	}
}
