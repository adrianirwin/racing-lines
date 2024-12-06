import * as AFRAME from 'aframe'
import { Log } from './../models/Logs'
import { View } from './Views'

export class SessionList {
	element: AFRAME.Entity
	session_summaries: View.AFRAMEEntityMap

	constructor(document: HTMLDocument) {
		this.element = document.createElement('a-entity')
		this.element.setAttribute('id', 'session_list')
		this.element.setAttribute('position', '0.0 1.6 -0.25')
		this.element.setAttribute('session_list', {})

		this.session_summaries = <View.AFRAMEEntityMap>{}
	}

	add_session(session: Log.Session): void {
		this.element.setAttribute('session_list', { session })

		const session_summary = document.createElement('a-entity')
		session_summary.setAttribute('position', '0.0 0.0 0.0')
		session_summary.setAttribute('session_summary', { session, progress_bar_scale: 0.5 })

		const session_name = document.createElement('a-entity')
		session_name.setAttribute('position', '0.0 0.02 0.0')
		session_name.setAttribute('text', {
			'width': 0.4,
			'anchor': 'left',
			'color': '#FFBB00',
			'value': session.name,
		})

		session_summary.appendChild(session_name)
		this.element.appendChild(session_summary)

		session.$smoothing_progress.subscribe((progress: number) => {
			session_summary.setAttribute('session_summary', { progress: progress })
		})

		this.session_summaries[session.name] = session_summary
	}
}
