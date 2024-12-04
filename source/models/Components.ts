import { Coordinate } from './Geometry'

export namespace Schema {
	export type ArrayNumber = {
		type: string
		default: Array<number>
	}
	export type Colour = {
		type: string
		default: string
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
		T extends Schema.String ?			string :
		T

	export type ToData<T> = {
		[PropertyKey in keyof T]: ToDataTypeMapping<T[PropertyKey]>
	}
}
