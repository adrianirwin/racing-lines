import * as AFRAME from 'aframe'
import { Coordinate } from './../models/Geometry'
import { Schema } from './../models/Components'
import { Log } from './../models/Logs'

interface SessionListSchema {
	session: Schema.Session
}

interface SessionListData extends Schema.ToData<SessionListSchema> {
	sessions: {
		[key: string]: Log.Session
	}
}

interface SessionList {
	schema: SessionListSchema
}

AFRAME.registerComponent<AFRAME.ComponentDefinition<SessionList>>('session_list', {
	schema: {
		session: {
			default: null,
			parse: (value: Log.Session): Log.Session => {
				return value
			},
			stringify: (value: Log.Session): string => {
				const count = Object.keys(value).length
				return count + ' session' + (count === 1 ?  '' : 's')
			}
		},
	},

	init: function () {
		const self = this as unknown as AFRAME.Component<SessionListData>

		self.data.sessions = <{ [key: string]: Log.Session }>{}
	},

	update: function (oldData) {
		const self = this as unknown as AFRAME.Component<SessionListData>

		// TODO: AFRAME.utils.deepEqual and AFRAME.utils.diff -- look useful
		if (self.data.session ?? false) {
			self.data.sessions[self.data.session.name] = self.data.session
		}
	},
})
