import * as AFRAME from 'aframe'
import forEach from 'lodash/forEach'
import isEmpty from 'lodash/isEmpty'
import isString from 'lodash/isString'
import { Coordinate } from './../models/Geometry'
import { Schema } from './../models/Components'

interface FilledGraphSchema {
	colour: Schema.Colour
	coords: Schema.Coords
	streamed_coords: Schema.String
	streamed_deltas: Schema.String
	streamed_index: Schema.Number
	length: Schema.Number
	reorientation_quaternion: Schema.Quaternion
}

interface FilledGraphData extends Schema.ToData<FilledGraphSchema> {
	fill_geometry: AFRAME.THREE.BufferGeometry
}

interface FilledGraph {
	schema: FilledGraphSchema
}

AFRAME.registerComponent<AFRAME.ComponentDefinition<FilledGraph>>('filled_graph', {
	schema: {
		colour: {
			type: 'color', default: '#E5C167'
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
				{x:  1, y: 0, z:  1},
				{x: -1, y: 0, z:  0},
				{x: -1, y: 0, z:  1},
				{x: -1, y: 0, z:  0},
				{x:  1, y: 0, z:  1},
			],
		},
		streamed_coords: {
			type: 'string', default: '',
		},
		streamed_deltas: {
			type: 'string', default: '',
		},
		streamed_index: {
			type: 'number', default: 0,
		},
		length: {
			type: 'number', default: 0,
		},
		reorientation_quaternion: {
			type: 'vec4', default: {x: 0, y: 0, z: 0, w: 0},
		},
	},

	init: function () {
		const self = this as unknown as AFRAME.Component<FilledGraphData>

		//	Materials
		const fill_material = new AFRAME.THREE.MeshBasicMaterial({
			// color: this.data.colour,
			transparent: true,
			opacity: 0.85,
			side: AFRAME.THREE.DoubleSide,
			depthWrite: true,
			vertexColors: true,
		})

		//	Geometry
		self.data.fill_geometry = new AFRAME.THREE.BufferGeometry()

		//	There seems to be something amiss with the update call that causes it to miss every other addition
		// this.point_count = 0

		const vertices_per_segment = 2
		const indicies_per_segment = 6

		const fill_indicies = new Array(self.data.length)
		for (let i = 0, l = (self.data.length - 1); i < l; i++) {
			fill_indicies[((i * indicies_per_segment) + 0)] =  ((i * 2) + 0)
			fill_indicies[((i * indicies_per_segment) + 1)] =  ((i * 2) + 1)
			fill_indicies[((i * indicies_per_segment) + 2)] =  ((i * 2) + 2)
			fill_indicies[((i * indicies_per_segment) + 3)] =  ((i * 2) + 3)
			fill_indicies[((i * indicies_per_segment) + 4)] =  ((i * 2) + 2)
			fill_indicies[((i * indicies_per_segment) + 5)] =  ((i * 2) + 1)
		}
		self.data.fill_geometry.setIndex(fill_indicies)

		const fill_positions = new Float32Array(self.data.length * vertices_per_segment * 3)
		const fill_colours = new Float32Array(self.data.length * vertices_per_segment * 3)

		self.data.fill_geometry.setAttribute('position', new AFRAME.THREE.BufferAttribute(fill_positions, 3))
		self.data.fill_geometry.setAttribute('color', new AFRAME.THREE.BufferAttribute(fill_colours, 3))

		//	Create the filled surface
		self.el.setObject3D('filled_surface', new AFRAME.THREE.Mesh(self.data.fill_geometry, fill_material))

		//	Plot value filled surface vertices
		// this.data.coords.forEach((point, index) => {
		// 	const position = (index * 3)

		// 	fill_positions[(position)] = point.x
		// 	fill_positions[(position + 1)] = point.y
		// 	fill_positions[(position + 2)] = point.z

		// 	this.point_count++
		// })

		self.data.fill_geometry.setDrawRange(0, 0)

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
		self.data.fill_geometry.applyMatrix4(rotation_matrix)
	},

	update: function (oldData) {
		const self = this as unknown as AFRAME.Component<FilledGraphData>

		if (isEmpty(self.data.streamed_coords) === false && isEmpty(self.data.streamed_deltas) === false) {
			const position = self.data.fill_geometry.getAttribute('position')
			const colour = self.data.fill_geometry.getAttribute('color')
			const streamed_coords = self.data.streamed_coords.split(',').map((coords) => AFRAME.utils.coordinates.parse(coords))
			const streamed_deltas = self.data.streamed_deltas.split(',').map((delta) => Number(delta))

			const boundary_topup =  0.265
			const boundary_maxup =  0.250
			const boundary_accel =  0.125
			const boundary_decel = -0.050
			const boundary_maxdn = -1.125

			const top_colour_maxup = new AFRAME.THREE.Color('rgb(252, 212, 000)')
			const top_colour_midup = new AFRAME.THREE.Color('rgb(255, 045, 241)')
			const top_colour_accel = new AFRAME.THREE.Color('rgb(050, 045, 241)')
			const top_colour_coast = new AFRAME.THREE.Color('rgb(050, 167, 241)')
			const top_colour_decel = new AFRAME.THREE.Color('rgb(255, 024, 000)')
			const top_colour_maxdn = new AFRAME.THREE.Color('rgb(097, 000, 079)')

			const bot_colour_maxup = new AFRAME.THREE.Color('rgb(000, 000, 000)')
			const bot_colour_midup = new AFRAME.THREE.Color('rgb(000, 000, 000)')
			const bot_colour_accel = new AFRAME.THREE.Color('rgb(000, 000, 000)')
			const bot_colour_coast = new AFRAME.THREE.Color('rgb(000, 000, 000)')
			const bot_colour_decel = new AFRAME.THREE.Color('rgb(000, 000, 000)')
			const bot_colour_maxdn = new AFRAME.THREE.Color('rgb(000, 000, 000)')

			let delta_colour = null
			let position_index = null
			forEach(streamed_coords, (coords, coords_index) => {
				position_index = ((self.data.streamed_index * 2) + coords_index) * 3

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

				const delta_index = Math.floor(coords_index / 2)

				let top_delta_colour = top_colour_coast
				let bot_delta_colour = bot_colour_coast

				//	TODO: Replace with method that takes the boundaries and list of colours on the gradient as inputs
				switch (true) {
					//	Maximum acceleration
					case streamed_deltas[delta_index] >= boundary_maxup:
						const top_colour_maxup_lerped = new AFRAME.THREE.Color(top_colour_midup).lerp(top_colour_maxup, ((streamed_deltas[delta_index] - boundary_maxup) * (1 / boundary_topup)))
						const bot_colour_maxup_lerped = new AFRAME.THREE.Color(bot_colour_midup).lerp(bot_colour_maxup, ((streamed_deltas[delta_index] - boundary_maxup) * (1 / boundary_topup)))

						top_delta_colour = top_colour_maxup_lerped
						bot_delta_colour = bot_colour_maxup_lerped
						break

					//	Accelerating
					case streamed_deltas[delta_index] >= boundary_accel:
						const top_colour_accel_lerped = new AFRAME.THREE.Color(top_colour_accel).lerp(top_colour_midup, ((streamed_deltas[delta_index] - boundary_accel) * (1 / boundary_maxup)))
						const bot_colour_accel_lerped = new AFRAME.THREE.Color(bot_colour_accel).lerp(bot_colour_midup, ((streamed_deltas[delta_index] - boundary_accel) * (1 / boundary_maxup)))

						top_delta_colour = top_colour_accel_lerped
						bot_delta_colour = bot_colour_accel_lerped
						break

					//	Minimum acceleration
					// case streamed_deltas[delta_index] === boundary_accel:
					// 	top_delta_colour = top_colour_accel
					// 	bot_delta_colour = bot_colour_accel
					// 	break

					//	Marginal acceleration
					case streamed_deltas[delta_index] > 0.0:
						const top_colour_marup_lerped = new AFRAME.THREE.Color(top_colour_coast).lerp(top_colour_accel, ((streamed_deltas[delta_index]) * (1 / boundary_accel)))
						const bot_colour_marup_lerped = new AFRAME.THREE.Color(bot_colour_coast).lerp(bot_colour_accel, ((streamed_deltas[delta_index]) * (1 / boundary_accel)))

						top_delta_colour = top_colour_marup_lerped
						bot_delta_colour = bot_colour_marup_lerped
						break

					//	Maximum deceleration
					case streamed_deltas[delta_index] < boundary_maxdn:
						top_delta_colour = top_colour_maxdn
						bot_delta_colour = bot_colour_maxdn
						break

					//	Decelerating
					case streamed_deltas[delta_index] <= boundary_decel:
						const top_colour_decel_lerped = new AFRAME.THREE.Color(top_colour_decel).lerp(top_colour_maxdn, ((streamed_deltas[delta_index] - boundary_decel) * (1 / boundary_maxdn)))
						const bot_colour_decel_lerped = new AFRAME.THREE.Color(bot_colour_decel).lerp(bot_colour_maxdn, ((streamed_deltas[delta_index] - boundary_decel) * (1 / boundary_maxdn)))

						top_delta_colour = top_colour_decel_lerped
						bot_delta_colour = bot_colour_decel_lerped
						break

					//	Minimum deceleration
					// case streamed_deltas[delta_index] === boundary_decel:
					// 	top_delta_colour = top_colour_decel
					// 	bot_delta_colour = bot_colour_decel
					// 	break

					//	Marginal deceleration
					case streamed_deltas[delta_index] < 0.0:
						const top_colour_mardn_lerped = new AFRAME.THREE.Color(top_colour_coast).lerp(top_colour_decel, ((streamed_deltas[delta_index]) * (1 / boundary_decel)))
						const bot_colour_mardn_lerped = new AFRAME.THREE.Color(bot_colour_coast).lerp(bot_colour_decel, ((streamed_deltas[delta_index]) * (1 / boundary_decel)))

						top_delta_colour = top_colour_mardn_lerped
						bot_delta_colour = bot_colour_mardn_lerped
						break
				}

				if (position_index % 2 === 1) {
					colour.array[(position_index + 0)] = top_delta_colour.r
					colour.array[(position_index + 1)] = top_delta_colour.g
					colour.array[(position_index + 2)] = top_delta_colour.b
				}
				else {
					colour.array[(position_index + 0)] = bot_delta_colour.r
					colour.array[(position_index + 1)] = bot_delta_colour.g
					colour.array[(position_index + 2)] = bot_delta_colour.b
				}

				// TODO: Unused?
				// this.point_count++
			})

			self.data.fill_geometry.setDrawRange(0, (position_index ?? 3) - 3)
			self.data.fill_geometry.attributes.position.needsUpdate = true
			self.data.fill_geometry.attributes.color.needsUpdate = true
			self.data.fill_geometry.computeBoundingSphere()
			self.data.fill_geometry.computeBoundingBox()
		}
	},

	remove: function () {
		const self = this as unknown as AFRAME.Component<FilledGraphData>

		self.el.removeObject3D('racing_line')
	}
})