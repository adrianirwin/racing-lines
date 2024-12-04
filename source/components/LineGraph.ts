import * as AFRAME from 'aframe'
import forEach from 'lodash/forEach'
import isEmpty from 'lodash/isEmpty'
import isString from 'lodash/isString'
import { Coordinate } from './../models/Geometry'
import { Schema } from './../models/Components'

interface LineGraphSchema {
	colour: Schema.Colour
	coords: Schema.Coords
	streamed_coords: Schema.String
	streamed_index: Schema.Number
	length: Schema.Number
	reorientation_quaternion: Schema.Quaternion
}

interface LineGraphData extends Schema.ToData<LineGraphSchema> {
	value_geometry: AFRAME.THREE.BufferGeometry
}

interface LineGraph {
	schema: LineGraphSchema
}

AFRAME.registerComponent<AFRAME.ComponentDefinition<LineGraph>>('line_graph', {
	schema: {
		colour: {
			type: 'color', default: '#FFE260'
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
				{x:  0, y: 0, z: -1}
			]
		},
		streamed_coords: {
			type: 'string', default: '',
		},
		streamed_index: {
			type: 'number', default: 0,
		},
		length: {
			type: 'number', default: 0
		},
		reorientation_quaternion: {
			type: 'vec4', default: {x: 0, y: 0, z: 0, w: 0}
		}
	},

	init: function () {
		const self = this as unknown as AFRAME.Component<LineGraphData>

		//	Materials
		const value_material = new AFRAME.THREE.LineBasicMaterial({
			color: self.data.colour,
			linewidth: 1,
		})

		//	Geometry
		self.data.value_geometry = new AFRAME.THREE.BufferGeometry()

		//	There seems to be something amiss with the update call that causes it to miss every other addition
		let point_count = 0

		const value_positions = new Float32Array(self.data.length * 3)
		self.data.value_geometry.setAttribute('position', new AFRAME.THREE.BufferAttribute(value_positions, 3))
		self.data.value_geometry.setDrawRange(0, 0)

		//	Create the value line
		self.el.setObject3D('value_line', new AFRAME.THREE.Line(self.data.value_geometry, value_material))

		//	Plot value line vertices
		self.data.coords.forEach((point, index) => {
			const position = (index * 3)

			value_positions[(position)] = point.x
			value_positions[(position + 1)] = point.y
			value_positions[(position + 2)] = point.z

			point_count++
		})
		self.data.value_geometry.setDrawRange(0, point_count)

		//	The original GPS data is stored as lat/long, after
		//	converting to cartesian coordinates, the 'up' vector is
		//	still correct in 'globe' space. This applies the calculated
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
		self.data.value_geometry.applyMatrix4(rotation_matrix)
	},

	update: function (oldData) {
		const self = this as unknown as AFRAME.Component<LineGraphData>

		if (isEmpty(self.data.streamed_coords) === false) {
			const position = self.data.value_geometry.getAttribute('position')
			const streamed_coords = self.data.streamed_coords.split(',').map((coords) => AFRAME.utils.coordinates.parse(coords))

			let position_index = null
			forEach(streamed_coords, (coords: Coordinate.Cartesian3D, coords_index: number) => {
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

			self.data.value_geometry.setDrawRange(0, self.data.streamed_index + streamed_coords.length)
			self.data.value_geometry.attributes.position.needsUpdate = true
			self.data.value_geometry.computeBoundingSphere()
			self.data.value_geometry.computeBoundingBox()
		}
	},

	remove: function () {
		const self = this as unknown as AFRAME.Component<LineGraphData>

		self.el.removeObject3D('racing_line')
	}
})
