import * as AFRAME from 'aframe'
import { Schema } from './../models/Components'

interface FixedSizeSchema {
	limit_max: Schema.Number
	limit_min: Schema.Number
	scaling_factor: Schema.Number
}

interface FixedSizeData extends Schema.ToData<FixedSizeSchema> {
	camera_el: AFRAME.Entity
	camera_vec: AFRAME.THREE.Vector3
	distance: number
	self_vec: AFRAME.THREE.Vector3
}

interface FixedSize {
	schema: FixedSizeSchema
}

AFRAME.registerComponent<AFRAME.ComponentDefinition<FixedSize>>('fixed_size', {
	schema: {
		limit_max: {
			type: 'number', default: 5,
		},
		limit_min: {
			type: 'number', default: 0.5,
		},
		scaling_factor: {
			type: 'number', default: 1,
		},
	},

	init: function () {
		const self = this as unknown as AFRAME.Component<FixedSizeData>

		self.data.self_vec = new AFRAME.THREE.Vector3()
		self.data.camera_vec = new AFRAME.THREE.Vector3()
		self.data.camera_el = document.querySelector('[camera]')

		self.data.distance = 0
	},

	tick: function () {
		const self = this as unknown as AFRAME.Component<FixedSizeData>

		self.data.camera_el.object3D.getWorldPosition(self.data.camera_vec)
		self.el.object3D.getWorldPosition(self.data.self_vec)

		self.data.distance = self.data.self_vec.distanceTo(self.data.camera_vec)

		self.el.object3D.scale.setScalar(Math.max(Math.min((self.data.distance * self.data.scaling_factor), self.data.limit_max), self.data.limit_min))
	},
})
