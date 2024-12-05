import * as AFRAME from 'aframe'
import { Coordinate } from './../models/Geometry'
import { Schema } from './../models/Components'

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
	},
})
