import * as AFRAME from 'aframe'
import { Coordinate } from './../models/Geometry'
import { Schema } from './../models/Components'
import { Log } from './../models/Logs'

interface SessionSummarySchema {
	progress: Schema.Number
	progress_bar_direction: Schema.Coord
	progress_bar_scale: Schema.Number
	session: Schema.Session
}

interface SessionSummaryData extends Schema.ToData<SessionSummarySchema> {
	session: Log.Session
	progress_bar_geometry: AFRAME.THREE.BufferGeometry
}

interface SessionSummary {
	schema: SessionSummarySchema
}

AFRAME.registerComponent<AFRAME.ComponentDefinition<SessionSummary>>('session_summary', {
	schema: {
		progress: {
			type: 'number', default: 0,
		},
		progress_bar_direction: {
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
			}
		},
	},

	init: function () {
		const self = this as unknown as AFRAME.Component<SessionSummaryData>

		const positions = new Float32Array([0, 0, 0, 0, 0, 0])
		self.data.progress_bar_geometry = new AFRAME.THREE.BufferGeometry()
		self.data.progress_bar_geometry.setAttribute('position', new AFRAME.THREE.BufferAttribute(positions, 3))
		self.data.progress_bar_geometry.setDrawRange(0, 0)

		//	Create the racing line
		self.el.setObject3D(
			'progress_bay',
			new AFRAME.THREE.Line(
				self.data.progress_bar_geometry,
				new AFRAME.THREE.LineBasicMaterial({
					color: '#EE9922',
					linewidth: 1,
				}),
			)
		)
	},

	update: function (oldData) {
		const self = this as unknown as AFRAME.Component<SessionSummaryData>

		if (self.data.progress > 0 && oldData.progress !== self.data.progress) {
			let progress_bar_end = new AFRAME.THREE.Vector3(self.data.progress_bar_direction.x, self.data.progress_bar_direction.y, self.data.progress_bar_direction.z)
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
