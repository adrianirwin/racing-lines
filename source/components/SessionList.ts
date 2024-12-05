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
			default: <Log.Session>{},
			parse: (value: Log.Session): Log.Session => {
				console.log('session', value)
				return value
			},
			stringify: (value: Log.Session): string => {
				return 'Session: ' + Object.keys(value).length
			}
		}
	},

	init: function () {
		const self = this as unknown as AFRAME.Component<SessionListData>

		self.data.sessions = <{ [key: string]: Log.Session }>{}
	},

	update: function (oldData) {
		const self = this as unknown as AFRAME.Component<SessionListData>

		// TODO: ick
		delete self.data.sessions['undefined']

		self.data.sessions[self.data.session.name] = self.data.session
	},
})
