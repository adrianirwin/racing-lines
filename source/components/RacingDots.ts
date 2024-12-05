import * as AFRAME from 'aframe'
import { Coordinate } from './../models/Geometry'
import { Schema } from './../models/Components'

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
	},
})
