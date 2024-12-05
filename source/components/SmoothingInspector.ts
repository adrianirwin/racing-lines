import * as AFRAME from 'aframe'
import { Coordinate } from './../models/Geometry'
import { Schema } from './../models/Components'

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
	},
})
