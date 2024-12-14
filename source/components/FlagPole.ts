import * as AFRAME from 'aframe'
import forEach from 'lodash/forEach'
import isEmpty from 'lodash/isEmpty'
import isString from 'lodash/isString'
import { Coordinate } from './../models/Geometry'
import { Schema } from './../models/Components'

interface FlagPoleSchema {
	colour: Schema.Colour
}

interface FlagPoleData extends Schema.ToData<FlagPoleSchema> {
	flag_geometry: AFRAME.THREE.BufferGeometry
	gap: number
	height: number
	pole_geometry: AFRAME.THREE.BufferGeometry
	width: number
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
		width: {
			type: 'number', default: 0.025,
		},
	},

	init: function () {
		const self = this as unknown as AFRAME.Component<FlagPoleData>

		//	Materials
		const material = new AFRAME.THREE.LineBasicMaterial({
			color: self.data.colour,
			linewidth: 1,
		})

		//	Flag Pole Geometry
		self.data.flag_geometry = new AFRAME.THREE.BufferGeometry()
		self.data.flag_geometry.setAttribute('position', new AFRAME.THREE.BufferAttribute(new Float32Array([
			(self.data.width / 2), ((self.data.gap * -1) + self.data.height), 0.0,
			(self.data.width / -2), ((self.data.gap * -1) + self.data.height), 0.0,
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
})