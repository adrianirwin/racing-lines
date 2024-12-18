import * as AFRAME from 'aframe'
import forEach from 'lodash/forEach'
import isEmpty from 'lodash/isEmpty'
import isString from 'lodash/isString'
import { Coordinate } from './../models/Geometry'
import { Schema } from './../models/Components'

interface FlagPoleSchema {
	colour: Schema.Colour
	limit_max: Schema.Number
	limit_min: Schema.Number
	width_max: Schema.Number
	width_min: Schema.Number
}

interface FlagPoleData extends Schema.ToData<FlagPoleSchema> {
	camera_el: AFRAME.Entity
	camera_vec: AFRAME.THREE.Vector3
	distance: number
	flag_geometry: AFRAME.THREE.BufferGeometry
	gap: number
	height: number
	pole_geometry: AFRAME.THREE.BufferGeometry
	self_vec: AFRAME.THREE.Vector3
}

interface FlagPole {
	schema: FlagPoleSchema
}

AFRAME.registerComponent<AFRAME.ComponentDefinition<FlagPole>>('flag_pole', {
	schema: {
		colour: {
			type: 'color', default: '#F2B718'
		},
		gap: {
			type: 'number', default: 0.005,
		},
		height: {
			type: 'number', default: 0.05,
		},
		limit_max: {
			type: 'number', default: 5.0,
		},
		limit_min: {
			type: 'number', default: 0.5,
		},
		width_max: {
			type: 'number', default: 0.25,
		},
		width_min: {
			type: 'number', default: 0.025,
		},
	},

	init: function () {
		const self = this as unknown as AFRAME.Component<FlagPoleData>

		self.data.self_vec = new AFRAME.THREE.Vector3()
		self.data.camera_vec = new AFRAME.THREE.Vector3()
		self.data.camera_el = document.querySelector('[camera]')
		self.data.distance = 0

		//	Materials
		const material = new AFRAME.THREE.LineBasicMaterial({
			color: self.data.colour,
			linewidth: 1,
		})

		//	Flag Pole Geometry
		self.data.flag_geometry = new AFRAME.THREE.BufferGeometry()
		self.data.flag_geometry.setAttribute('position', new AFRAME.THREE.BufferAttribute(new Float32Array([
			0.0, ((self.data.gap * -1) + self.data.height), 0.0,
			0.0, ((self.data.gap * -1) + self.data.height), 0.0,
		]), 3))

		self.data.pole_geometry = new AFRAME.THREE.BufferGeometry()
		self.data.pole_geometry.setAttribute('position', new AFRAME.THREE.BufferAttribute(new Float32Array([
			0.0, 0.0, 0.0,
			0.0, ((self.data.gap * -1) + self.data.height), 0.0,
		]), 3))

		self.el.setObject3D('flag', new AFRAME.THREE.Line(self.data.flag_geometry, material))
		self.el.setObject3D('pole', new AFRAME.THREE.Line(self.data.pole_geometry, material))
	},

	remove: function () {
		const self = this as unknown as AFRAME.Component<FlagPoleData>

		self.el.removeObject3D('flag')
		self.el.removeObject3D('pole')
	},

	tick: function () {
		const self = this as unknown as AFRAME.Component<FlagPoleData>

		self.data.camera_el.object3D.getWorldPosition(self.data.camera_vec)
		self.el.object3D.getWorldPosition(self.data.self_vec)

		self.data.distance = self.data.self_vec.distanceTo(self.data.camera_vec)

		let width = 0.0

		if (self.data.distance > self.data.limit_max) {
			width = self.data.width_max
		}
		else if (self.data.distance < self.data.limit_min) {
			width = self.data.width_min
		}
		else {
			width = ((self.data.distance - self.data.limit_min) / ((self.data.limit_max - self.data.limit_min) / (self.data.width_max - self.data.width_min))) + self.data.width_min
		}

		const position = self.data.flag_geometry.getAttribute('position')
		position.array[0] = width / 2
		position.array[3] = width / -2
		self.data.flag_geometry.attributes.position.needsUpdate = true
	},
})