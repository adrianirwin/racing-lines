import * as AFRAME from 'aframe'
import { Coordinate } from './../models/Geometry'
import { Schema } from './../models/Components'
import { Log } from './../models/Logs'

interface SessionSummarySchema {
	progress: Schema.Number
	progress_bar_facing_vec: Schema.Coord
	progress_bar_growth_vec: Schema.Coord
	progress_bar_scale: Schema.Number
	session: Schema.Session
}

interface SessionSummaryData extends Schema.ToData<SessionSummarySchema> {
	session: Log.Session
	progress_bar_geometry: AFRAME.THREE.BufferGeometry
	progress_bar_endcap_max_geometry: AFRAME.THREE.BufferGeometry
	progress_bar_endcap_min_geometry: AFRAME.THREE.BufferGeometry
}

interface SessionSummary {
	schema: SessionSummarySchema
}

AFRAME.registerComponent<AFRAME.ComponentDefinition<SessionSummary>>('session_summary', {
	schema: {
		progress: {
			type: 'number', default: 0,
		},
		progress_bar_facing_vec: {
			type: 'vec3', default: {x: 0, y: 0, z: 1},
		},
		progress_bar_growth_vec: {
			type: 'vec3', default: {x: 1, y: 0, z: 0},
		},
		progress_bar_scale: {
			type: 'number', default: 1,
		},
		session: {
			default: null,
			parse: (value: Log.Session): Log.Session => {
				return value
			},
			stringify: (value: Log.Session): string => {
				if (value.name !== '') {
					return value.name
				}
				return 'no session'
			},
		},
	},

	init: function () {
		const self = this as unknown as AFRAME.Component<SessionSummaryData>

		const progress_bar_material = new AFRAME.THREE.LineBasicMaterial({
			color: '#EE9922',
			linewidth: 1,
		})

		//	Progress Bar
		self.data.progress_bar_geometry = new AFRAME.THREE.BufferGeometry()
		self.data.progress_bar_geometry.setAttribute('position', new AFRAME.THREE.BufferAttribute(new Float32Array([0, 0, 0, 0, 0, 0]), 3))
		self.data.progress_bar_geometry.setDrawRange(0, 0)

		self.el.setObject3D('progress_bar', new AFRAME.THREE.Line(self.data.progress_bar_geometry, progress_bar_material))

		//	Progress Bar Endcaps
		self.data.progress_bar_endcap_max_geometry = new AFRAME.THREE.BufferGeometry()
		self.data.progress_bar_endcap_min_geometry = new AFRAME.THREE.BufferGeometry()

		const progress_bar_end = new AFRAME.THREE.Vector3(
			self.data.progress_bar_growth_vec.x,
			self.data.progress_bar_growth_vec.y,
			self.data.progress_bar_growth_vec.z,
		).multiplyScalar(self.data.progress_bar_scale)

		const endcap_min_vector_start = new AFRAME.THREE.Vector3().crossVectors(self.data.progress_bar_facing_vec, self.data.progress_bar_growth_vec)
		const endcap_min_vector_end = endcap_min_vector_start.clone().negate()
		const endcap_max_vector_start = endcap_min_vector_start.multiplyScalar(0.01 * self.data.progress_bar_scale).clone().add(progress_bar_end)
		const endcap_max_vector_end = endcap_min_vector_end.multiplyScalar(0.01 * self.data.progress_bar_scale).clone().add(progress_bar_end)

		self.data.progress_bar_endcap_max_geometry.setAttribute('position', new AFRAME.THREE.BufferAttribute(new Float32Array([
			endcap_max_vector_start.x, endcap_max_vector_start.y, endcap_max_vector_start.z,
			endcap_max_vector_end.x, endcap_max_vector_end.y, endcap_max_vector_end.z,
		]), 3))
		self.data.progress_bar_endcap_min_geometry.setAttribute('position', new AFRAME.THREE.BufferAttribute(new Float32Array([
			endcap_min_vector_start.x, endcap_min_vector_start.y, endcap_min_vector_start.z,
			endcap_min_vector_end.x, endcap_min_vector_end.y, endcap_min_vector_end.z,
		]), 3))

		self.el.setObject3D('self.data.progress_bar_endcap_max', new AFRAME.THREE.Line(self.data.progress_bar_endcap_max_geometry, progress_bar_material))
		self.el.setObject3D('self.data.progress_bar_endcap_min', new AFRAME.THREE.Line(self.data.progress_bar_endcap_min_geometry, progress_bar_material))
	},

	update: function (oldData) {
		const self = this as unknown as AFRAME.Component<SessionSummaryData>

		if (self.data.progress > 0 && oldData.progress !== self.data.progress) {
			let progress_bar_end = new AFRAME.THREE.Vector3(self.data.progress_bar_growth_vec.x, self.data.progress_bar_growth_vec.y, self.data.progress_bar_growth_vec.z)
				.multiplyScalar(self.data.progress_bar_scale)
				.multiplyScalar(self.data.progress)
			
			const position = self.data.progress_bar_geometry.getAttribute('position')
			position.array[3] = progress_bar_end.x
			position.array[4] = progress_bar_end.y
			position.array[5] = progress_bar_end.z
			progress_bar_end
			self.data.progress_bar_geometry.setDrawRange(0, 6)
			self.data.progress_bar_geometry.attributes.position.needsUpdate = true
			self.data.progress_bar_geometry.computeBoundingSphere()
			self.data.progress_bar_geometry.computeBoundingBox()
		}
	},
})
