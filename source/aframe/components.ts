import * as AFRAME from 'aframe'
import * as _ from 'lodash'
import {
	Coordinate,
	Schema,
} from './../models/racing_lines'


//	Ground Plane

interface GroundPlaneSchema {
	colour: Schema.Colour
	count: Schema.Number
	gap: Schema.Number
	size: Schema.Number
}

interface GroundPlaneData extends Schema.ToData<GroundPlaneSchema> {
	ground_plane_dots_geometry: AFRAME.THREE.BufferGeometry
}

interface GroundPlane {
	schema: GroundPlaneSchema
}

AFRAME.registerComponent<AFRAME.ComponentDefinition<GroundPlane>>('ground_plane', {
	schema: {
		colour: {
			type: 'color', default: '#FFFFF'
		},
		count: {
			type: 'number', default: 20
		},
		gap: {
			type: 'number', default: 10
		},
		size: {
			type: 'number', default: 0.5
		}
	},

	init: function () {
		const self = this as unknown as AFRAME.Component<GroundPlaneData>

		self.data.ground_plane_dots_geometry = new AFRAME.THREE.BufferGeometry()

		const total_points = ((self.data.count + 1) * (self.data.count + 1)) // Adds a center point
		const span = (self.data.gap * self.data.count) / 2
		const maximum_distance = (new AFRAME.THREE.Line3(new AFRAME.THREE.Vector3(0, 0, 0), new AFRAME.THREE.Vector3(span, 0, 0))).distance()

		const vertices = []
		const colours = []

		const temp_colour_clamp = new AFRAME.THREE.Color(0x353638)
		const origin = new AFRAME.THREE.Vector3(0, 0, 0)
		let point = null
		let vector_origin_to_point = null
		let factor = null
		let colour = null

		for (let x = -span; x <= span; x += self.data.gap) {
			for (let z = -span; z <= span; z += self.data.gap) {
				vertices.push(x, 0, z)
				point = new AFRAME.THREE.Vector3(x, 0, z)

				vector_origin_to_point = new AFRAME.THREE.Line3(origin, point)
				factor = Math.abs(Math.min((vector_origin_to_point.distance() / maximum_distance), 1) - 1)

				colours.push(
					Math.max((0.4 * factor), temp_colour_clamp.r),
					Math.max((0.45 * factor), temp_colour_clamp.g),
					Math.max((0.65 * factor), temp_colour_clamp.b),
				)
			}
		}

		self.data.ground_plane_dots_geometry.setAttribute('position', new AFRAME.THREE.BufferAttribute(new Float32Array(vertices), 3))
		self.data.ground_plane_dots_geometry.setAttribute('color', new AFRAME.THREE.BufferAttribute(new Float32Array(colours), 3))

		self.el.setObject3D('ground_plane_dots', new AFRAME.THREE.Points(
			self.data.ground_plane_dots_geometry,
			new AFRAME.THREE.PointsMaterial({
				vertexColors: true,
				size: self.data.size,
				sizeAttenuation: true
			}),
		))
	},

	remove: function () {
		const self = this as unknown as AFRAME.Component<GroundPlaneData>

		self.el.removeObject3D('ground_plane_dots')
	}
})


//	Racing Lines

interface RacingLineSchema {
	colour: Schema.Colour
	coords: Schema.Coords
	streamed_coords: Schema.String
	streamed_index: Schema.Number
	lap_boundaries: Schema.ArrayNumber
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
				if (_.isEmpty(value) === false && _.isString(value) === true) {
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
		lap_boundaries: {
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

		if (_.isEmpty(self.data.streamed_coords) === false) {
			const position = self.data.racing_line_geometry.getAttribute('position')

			const streamed_coords = self.data.streamed_coords.split(',').map((coords) => AFRAME.utils.coordinates.parse(coords))

			let position_index = null
			_.forEach(streamed_coords, (coords, coords_index) => {

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
	}
})


//	Line Graph

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
				if (_.isEmpty(value) === false && _.isString(value) === true) {
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

		if (_.isEmpty(self.data.streamed_coords) === false) {
			const position = self.data.value_geometry.getAttribute('position')
			const streamed_coords = self.data.streamed_coords.split(',').map((coords) => AFRAME.utils.coordinates.parse(coords))

			let position_index = null
			_.forEach(streamed_coords, (coords: Coordinate.Cartesian3D, coords_index: number) => {
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


//	Filled Graph

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
				if (_.isEmpty(value) === false && _.isString(value) === true) {
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
				{x:  1, y: 0, z:  1}
			]
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
			type: 'number', default: 0
		},
		reorientation_quaternion: {
			type: 'vec4', default: {x: 0, y: 0, z: 0, w: 0}
		}
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

		if (_.isEmpty(self.data.streamed_coords) === false && _.isEmpty(self.data.streamed_deltas) === false) {
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
			_.forEach(streamed_coords, (coords, coords_index) => {
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


//	Racing Dots

interface RacingDotsSchema {
	colour: Schema.Colour
	coords: Schema.Coords
	reorientation_quaternion: Schema.Quaternion
}

interface RacingDotsData extends Schema.ToData<RacingDotsSchema> {
	racing_dots_geometry: AFRAME.THREE.BufferGeometry
	racing_dots_material: AFRAME.THREE.PointsMaterial
}

interface RacingDots {
	schema: RacingDotsSchema
}

AFRAME.registerComponent<AFRAME.ComponentDefinition<RacingDots>>('racing_dots', {
	schema: {
		colour: {
			type: 'color', default: '#FF88FF'
		},
		coords: {
			parse: (value: string): Array<Coordinate.Cartesian3D> => {
				return value.split(',').map(AFRAME.utils.coordinates.parse)
			},
			default: [
				{x:  1, y: 0, z:  0},
				{x: -1, y: 0, z:  0},
				{x:  0, y: 0, z:  1},
				{x:  0, y: 0, z: -1}
			]
		},
		reorientation_quaternion: {
			type: 'vec4', default: {x: 0, y: 0, z: 0, w: 0}
		}
	},

	init: function () {
		const self = this as unknown as AFRAME.Component<RacingDotsData>

		//	Materials
		self.data.racing_dots_material = new AFRAME.THREE.PointsMaterial({ color: self.data.colour, size: 4.0, sizeAttenuation: false })
	},

	update: function (oldData) {
		const self = this as unknown as AFRAME.Component<RacingDotsData>

		// const start_finish_points = []

		//	Create the racing line
		self.data.racing_dots_geometry = new AFRAME.THREE.BufferGeometry()
		self.el.setObject3D('racing_dots', new AFRAME.THREE.Points(self.data.racing_dots_geometry, self.data.racing_dots_material))

		//	Plot racing line vertices
		self.data.coords.forEach(function (point, index) {
			// TODO: Outdated
			// self.data.racing_dots_geometry.vertices.push(new AFRAME.THREE.Vector3(point.x, point.y, point.z))
		})

		//	The original GPS data is stored as lat/long, after
		//	converting to cartesian coordinates, the 'up' vector is
		//	still correct in 'globe' space. This applies the calculated
		//	rotation transformation to the racing line geometry,
		//	so 'up' for subsequent operations is now Z+.
		let rotation_matrix = new AFRAME.THREE.Matrix4()
		let reorientation_quaternion = new AFRAME.THREE.Quaternion(
			self.data.reorientation_quaternion.x,
			self.data.reorientation_quaternion.y,
			self.data.reorientation_quaternion.z,
			self.data.reorientation_quaternion.w
		)
		rotation_matrix.makeRotationFromQuaternion(reorientation_quaternion)
		self.data.racing_dots_geometry.applyMatrix4(rotation_matrix)
	},

	remove: function () {
		const self = this as unknown as AFRAME.Component<RacingDotsData>

		self.el.removeObject3D('racing_dots')
	}
})


//	Smoothing Inspector

interface SmoothingInspectorSchema {
	colour: Schema.Colour
	coords0: Schema.Coords
	coords1: Schema.Coords
	coords2: Schema.Coords
	coords3: Schema.Coords
	coords4: Schema.Coords
	coords5: Schema.Coords
	reorientation_quaternion: Schema.Quaternion
}

interface SmoothingInspectorData extends Schema.ToData<SmoothingInspectorSchema> {
	smoothing_geometry: AFRAME.THREE.BufferGeometry
	smoothing_material: AFRAME.THREE.LineBasicMaterial
}

interface SmoothingInspector {
	schema: SmoothingInspectorSchema
}

AFRAME.registerComponent<AFRAME.ComponentDefinition<SmoothingInspector>>('smoothing_inspector', {
	schema: {
		colour: {
			type: 'color', default: '#FFFF00'
		},
		coords0: {
			parse: (value: string): Array<Coordinate.Cartesian3D> => {
				return value.split(',').map(AFRAME.utils.coordinates.parse)
			},
			default: [
				{x:  1, y: 0, z:  0},
				{x: -1, y: 0, z:  0},
				{x:  0, y: 0, z:  1},
				{x:  0, y: 0, z: -1}
			]
		},
		coords1: {
			parse: (value: string) => {
				return value.split(',').map(AFRAME.utils.coordinates.parse)
			},
			default: [
				{x:  1, y: 0, z:  0},
				{x: -1, y: 0, z:  0},
				{x:  0, y: 0, z:  1},
				{x:  0, y: 0, z: -1}
			]
		},
		coords2: {
			parse: (value: string) => {
				return value.split(',').map(AFRAME.utils.coordinates.parse)
			},
			default: [
				{x:  1, y: 0, z:  0},
				{x: -1, y: 0, z:  0},
				{x:  0, y: 0, z:  1},
				{x:  0, y: 0, z: -1}
			]
		},
		coords3: {
			parse: (value: string) => {
				return value.split(',').map(AFRAME.utils.coordinates.parse)
			},
			default: [
				{x:  1, y: 0, z:  0},
				{x: -1, y: 0, z:  0},
				{x:  0, y: 0, z:  1},
				{x:  0, y: 0, z: -1}
			]
		},
		coords4: {
			parse: (value: string) => {
				return value.split(',').map(AFRAME.utils.coordinates.parse)
			},
			default: [
				{x:  1, y: 0, z:  0},
				{x: -1, y: 0, z:  0},
				{x:  0, y: 0, z:  1},
				{x:  0, y: 0, z: -1}
			]
		},
		coords5: {
			parse: (value: string) => {
				return value.split(',').map(AFRAME.utils.coordinates.parse)
			},
			default: [
				{x:  1, y: 0, z:  0},
				{x: -1, y: 0, z:  0},
				{x:  0, y: 0, z:  1},
				{x:  0, y: 0, z: -1}
			]
		},
		reorientation_quaternion: {
			type: 'vec4', default: {x: 0, y: 0, z: 0, w: 0}
		}
	},

	init: function () {
		const self = this as unknown as AFRAME.Component<SmoothingInspectorData>

		//	Materials
		self.data.smoothing_material = new AFRAME.THREE.LineBasicMaterial({
			color: self.data.colour,
			linewidth: 1,
		})
	},

	update: function (oldData) {
		const self = this as unknown as AFRAME.Component<SmoothingInspectorData>

		// const start_finish_points = []

		//	Create the racing line
		self.data.smoothing_geometry = new AFRAME.THREE.BufferGeometry()
		self.el.setObject3D('smoothing_inspector', new AFRAME.THREE.LineSegments(self.data.smoothing_geometry, self.data.smoothing_material))

		//	Plot racing line vertices
		self.data.coords0.forEach((point: Coordinate.Cartesian3D, index: number) => {
			// self.data.smoothing_geometry.vertices.push(new AFRAME.THREE.Vector3(point.x, point.y, point.z))
			// self.data.smoothing_geometry.vertices.push(new AFRAME.THREE.Vector3(self.data.coords1[index].x, self.data.coords1[index].y, self.data.coords1[index].z))
			// self.data.smoothing_geometry.vertices.push(new AFRAME.THREE.Vector3(self.data.coords1[index].x, self.data.coords1[index].y, self.data.coords1[index].z))
			// self.data.smoothing_geometry.vertices.push(new AFRAME.THREE.Vector3(self.data.coords2[index].x, self.data.coords2[index].y, self.data.coords2[index].z))
			// self.data.smoothing_geometry.vertices.push(new AFRAME.THREE.Vector3(self.data.coords2[index].x, self.data.coords2[index].y, self.data.coords2[index].z))
			// self.data.smoothing_geometry.vertices.push(new AFRAME.THREE.Vector3(self.data.coords3[index].x, self.data.coords3[index].y, self.data.coords3[index].z))
			// self.data.smoothing_geometry.vertices.push(new AFRAME.THREE.Vector3(self.data.coords3[index].x, self.data.coords3[index].y, self.data.coords3[index].z))
			// self.data.smoothing_geometry.vertices.push(new AFRAME.THREE.Vector3(self.data.coords4[index].x, self.data.coords4[index].y, self.data.coords4[index].z))
			// self.data.smoothing_geometry.vertices.push(new AFRAME.THREE.Vector3(self.data.coords4[index].x, self.data.coords4[index].y, self.data.coords4[index].z))
			// self.data.smoothing_geometry.vertices.push(new AFRAME.THREE.Vector3(self.data.coords5[index].x, self.data.coords5[index].y, self.data.coords5[index].z))
		})

		//	The original GPS data is stored as lat/long, after
		//	converting to cartesian coordinates, the 'up' vector is
		//	still correct in 'globe' space. This applies the calculated
		//	rotation transformation to the racing line geometry,
		//	so 'up' for subsequent operations is now Z+.
		let rotation_matrix = new AFRAME.THREE.Matrix4()
		let reorientation_quaternion = new AFRAME.THREE.Quaternion(
			self.data.reorientation_quaternion.x,
			self.data.reorientation_quaternion.y,
			self.data.reorientation_quaternion.z,
			self.data.reorientation_quaternion.w
		)
		rotation_matrix.makeRotationFromQuaternion(reorientation_quaternion)
		self.data.smoothing_geometry.applyMatrix4(rotation_matrix)
	},

	remove: function () {
		const self = this as unknown as AFRAME.Component<SmoothingInspectorData>

		self.el.removeObject3D('smoothing_inspector')
	}
})


// AFRAME.registerComponent('grabbable', {
// 	schema: {
// 		hand: {type: 'selector', default: '#left_hand'}
// 	},
// 	init: () => {
// 		window.console.info('grabbable', this, this.data.hand)

// 		window.console.info(this.el)
// 		this.hand = this.data.hand
// 		this.thumbstick = _.get(this.hand, 'components["tracked-controls"].axis', null)
// 		this.el.setAttribute('rotation', { x: 0, y: 0, z: 0 })
// 	},

// 	tick: (time, timeDelta) => {
// 		if (this.thumbstick !== null) {
// 			window.console.info(Math.round(time), this.thumbstick[0], this.thumbstick[1])

// 			const rotation = this.el.getAttribute('rotation', { x: 0, y: 0, z: 0 })
// 			rotation.y += (this.thumbstick[0] * 10)
// 			this.el.setAttribute('rotation', rotation)
// 			// this.el.setAttribute()
// 		}
// 	}
// })
