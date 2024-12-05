import * as AFRAME from 'aframe'
import forEach from 'lodash/forEach'
import isEmpty from 'lodash/isEmpty'
import isString from 'lodash/isString'
import { Coordinate } from './../models/Geometry'
import { Schema } from './../models/Components'

interface RacingLineSchema {
	colour: Schema.Colour
	coords: Schema.Coords
	streamed_coords: Schema.String
	streamed_index: Schema.Number
	lap_first_point_indexes: Schema.ArrayNumber
	lap_offset_length: Schema.Number
	length: Schema.Number
	reorientation_quaternion: Schema.Quaternion
}

interface RacingLineData extends Schema.ToData<RacingLineSchema> {
	racing_line_geometry: AFRAME.THREE.BufferGeometry
}

interface RacingLine {
	schema: RacingLineSchema
}

AFRAME.registerComponent<AFRAME.ComponentDefinition<RacingLine>>('racing_line', {
	schema: {
		colour: {
			type: 'color', default: '#FF0000'
		},
		coords: {
			parse: (value: string): Array<Coordinate.Cartesian3D> => {
				if (isEmpty(value) === false && isString(value) === true) {
					return value.split(',').map(AFRAME.utils.coordinates.parse)
				} else {
					return new Array<Coordinate.Cartesian3D>()
				}
			},
			default: [
				{x:  1, y: 0, z:  0},
				{x: -1, y: 0, z:  0},
				{x:  0, y: 0, z:  1},
				{x:  0, y: 0, z: -1},
			],
		},
		streamed_coords: {
			type: 'string', default: '',
		},
		streamed_index: {
			type: 'number', default: 0,
		},
		lap_first_point_indexes: {
			type: 'array', default: [0],
		},
		lap_offset_length: {
			type: 'number', default: 10,
		},
		length: {
			type: 'number', default: 0,
		},
		reorientation_quaternion: {
			type: 'vec4', default: {x: 0, y: 0, z: 0, w: 0},
		},
	},

	init: function () {
		const self = this as unknown as AFRAME.Component<RacingLineData>

		//	Will the line 'grow' over time via the update call?
		const will_grow = (self.data.length > 0)? true: false

		//	Materials
		const racing_line_material = new AFRAME.THREE.LineBasicMaterial({
			color: self.data.colour,
			linewidth: 1,
		})
		const start_finish_material = new AFRAME.THREE.LineBasicMaterial({
			color: '#FFFF00',
			linewidth: 1,
		})

		// const start_finish_points = new Array<number>()
		let vertices_count = 0
		let positions = new Float32Array(self.data.length * 3) // TODO - This may not be the best way to do this

		//	Geometry
		self.data.racing_line_geometry = new AFRAME.THREE.BufferGeometry()
		if (will_grow === true) {
			//	There seems to be something amiss with the update call that causes it to miss every other addition
			//	TODO: ^^ This may no longer be the case

			self.data.racing_line_geometry.setAttribute('position', new AFRAME.THREE.BufferAttribute(positions, 3))
			self.data.racing_line_geometry.setDrawRange(0, 0)
		}

		//	Create the racing line
		self.el.setObject3D('racing_line', new AFRAME.THREE.Line(self.data.racing_line_geometry, racing_line_material))

		//	Plot racing line vertices
		// TODO - This may not be the best way to do this
		let lap_offset_increment = 0
		self.data.coords.forEach((point: Coordinate.Cartesian3D, index: number) => {
			if (will_grow === true) {
				const position = (index * 3)

				positions[(position)] = point.x
				positions[(position + 1)] = point.y
				positions[(position + 2)] = point.z

				vertices_count++
			}
			// else {
			// 	self.data.racing_line_geometry.vertices.push(new AFRAME.THREE.Vector3(point.x, point.y, point.z))
			// }
		})

		//	The original GPS data is stored as lat/long, after
		//	converting to cartesian coordinates, the 'up' vector is
		//	still correct in 'globe/spherical' space. This applies the calculated
		//	rotation transformation to the racing line geometry,
		//	so 'up' for subsequent operations is now Z+.
		const rotation_matrix = new AFRAME.THREE.Matrix4()
		const reorientation_quaternion = new AFRAME.THREE.Quaternion(
			self.data.reorientation_quaternion.x,
			self.data.reorientation_quaternion.y,
			self.data.reorientation_quaternion.z,
			self.data.reorientation_quaternion.w
		)
		rotation_matrix.makeRotationFromQuaternion(reorientation_quaternion)
		self.data.racing_line_geometry.applyMatrix4(rotation_matrix)

		if (will_grow === true) {
			//	Create start/finish lines
			// TODO: Not sure if this is used, or if point: AFRAME.THREE.Vector3 is correct
			// start_finish_points.forEach((point: AFRAME.THREE.Vector3, index: number) => {
			// 	const start_finish_geometry = new AFRAME.THREE.BufferGeometry()
			// 	start_finish_geometry.vertices.push(point)
			// 	start_finish_geometry.vertices.push(new AFRAME.THREE.Vector3((point.x + 20), (point.y + 20), point.z))
			// 	self.el.setObject3D(('start_finish_line_' + index), new AFRAME.THREE.Line(start_finish_geometry, start_finish_material))
			// })
		}
	},

	update: function (oldData) {
		const self = this as unknown as AFRAME.Component<RacingLineData>

		if (isEmpty(self.data.streamed_coords) === false) {
			const position = self.data.racing_line_geometry.getAttribute('position')

			const streamed_coords = self.data.streamed_coords.split(',').map((coords) => AFRAME.utils.coordinates.parse(coords))

			let position_index = null
			forEach(streamed_coords, (coords, coords_index) => {

				position_index = (self.data.streamed_index + coords_index) * 3

				const vertex = new AFRAME.THREE.Vector3(coords.x, coords.y, coords.z)
				const reorientation_quaternion = new AFRAME.THREE.Quaternion(
					self.data.reorientation_quaternion.x,
					self.data.reorientation_quaternion.y,
					self.data.reorientation_quaternion.z,
					self.data.reorientation_quaternion.w
				)
				vertex.applyQuaternion(reorientation_quaternion)

				position.array[(position_index + 0)] = vertex.x
				position.array[(position_index + 1)] = vertex.y
				position.array[(position_index + 2)] = vertex.z
			})

			self.data.racing_line_geometry.setDrawRange(0, self.data.streamed_index + streamed_coords.length)
			self.data.racing_line_geometry.attributes.position.needsUpdate = true
			self.data.racing_line_geometry.computeBoundingSphere()
			self.data.racing_line_geometry.computeBoundingBox()
		}
	},

	remove: function () {
		const self = this as unknown as AFRAME.Component<RacingLineData>

		self.el.removeObject3D('racing_line')
	},
})
