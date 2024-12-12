import * as AFRAME from 'aframe'
import { BehaviorSubject, Subject } from 'rxjs'
import { Global } from './../models/Globals'
import { Log, RacingLinePoint } from './../models/Logs'
import { State } from './../models/States'
import { View } from './Views'
import SessionThumbnail from './SessionThumbnail'

export default class SessionList {
	root_el: AFRAME.Entity
	graphs_root_el: AFRAME.Entity

	thumbnails: View.SessionThumbnailEntityMap

	constructor(document: HTMLDocument, graphs_root_el: AFRAME.Entity) {
		this.graphs_root_el = graphs_root_el

		this.root_el = document.createElement('a-entity')
		this.root_el.setAttribute('position', '0.0 0.0 0.0')
		this.root_el.setAttribute('session_list', {})

		this.thumbnails = <View.SessionThumbnailEntityMap>{}

		const title = document.createElement('a-entity')
		title.setAttribute('position', '0.0 0.0 0.0')
		title.setAttribute('text', {
			anchor: 'left',
			color: '#F2B718',
			letterSpacing: 16,
			width: 0.3,
			value: 'SESSIONS',
		})

		//	Background
		const box = document.createElement('a-plane')
		box.setAttribute('position', '0.15 0.0 -0.0025')
		box.setAttribute('width', 0.32)
		box.setAttribute('height', 0.02)
		box.setAttribute('color', '#262626')
		box.setAttribute('roughness', 1.0)
		box.setAttribute('side', 'double')

		this.root_el.appendChild(title)
		this.root_el.appendChild(box)

		//	Listen to the global state
		Global.State.$sessions.subscribe((sessions: State.Sessions) => {
			const count = Object.keys(sessions).length
			if (count > 0) {
				title.setAttribute('text', { value: 'SESSIONS [' + Object.keys(sessions).length + ']' })
			}
			else {
				title.setAttribute('text', { value: 'SESSIONS' })
			}
		})

		Global.State.$session_added.subscribe((session: Log.Session) => {
			this.add_session(document, session)
		})

		Global.State.$session_deleted.subscribe((session: Log.Session) => {
			this.delete_session(document, session)
		})
	}

	set_position(x: number, y: number, z: number): void {
		this.root_el.setAttribute('position', x + ' ' + y + ' ' + z)
	}

	add_session(document: HTMLDocument, session: Log.Session): void {
		if (this.thumbnails[session.name] === undefined) {
			this.thumbnails[session.name] = new SessionThumbnail(document, session, this.graphs_root_el)
			this.reflow_thumbnails(session.name)
			this.root_el.appendChild(this.thumbnails[session.name].root_el)
		}
		else {
			// TODO: Something better than this...
			console.log('Session already loaded')
		}
	}

	delete_session(document: HTMLDocument, session: Log.Session): void {
		if (this.thumbnails[session.name] !== undefined) {
			this.root_el.removeChild(this.thumbnails[session.name].root_el)
			delete this.thumbnails[session.name]
			this.reflow_thumbnails()
		}
		else {
			// TODO: Something better than this...
			console.log('Session already deleted')
		}
	}

	reflow_thumbnails(name?: string): void {
		if (name && this.thumbnails[name]) {
			this.thumbnails[name].root_el.setAttribute('position', '0.0 ' + (((Object.keys(this.thumbnails).length - 1) * -0.082) - 0.03) + ' 0.0')
		}
		else {
			Object.keys(this.thumbnails).forEach((name: string, i: number) => {
				this.thumbnails[name].root_el.setAttribute('position', '0.0 ' + ((i * -0.082) - 0.03) + ' 0.0')
			})
		}
	}
}
