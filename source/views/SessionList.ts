import * as AFRAME from 'aframe'
import { Log } from './../models/Logs'
import { View } from './Views'
import SessionThumbnail from './SessionThumbnail'

export default  class SessionList {
	root_el: AFRAME.Entity
	thumbnails_el: View.SessionThumbnailEntityMap

	constructor(document: HTMLDocument) {
		this.root_el = document.createElement('a-entity')
		this.root_el.setAttribute('id', 'session_list')
		this.root_el.setAttribute('position', '0.0 0.0 0.0')
		this.root_el.setAttribute('session_list', {})

		this.thumbnails_el = <View.SessionThumbnailEntityMap>{}

		const title = document.createElement('a-entity')
		title.setAttribute('position', '0.0 0.0 0.0')
		title.setAttribute('text', {
			'anchor': 'left',
			'color': '#F2B718',
			'letterSpacing': 16,
			'width': 0.3,
			'value': 'SESSIONS',
		})

		const box = document.createElement('a-plane')
		box.setAttribute('position', '0.15 0.0 -0.0025')
		box.setAttribute('width', 0.32)
		box.setAttribute('height', 0.02)
		box.setAttribute('color', '#262626')

		this.root_el.appendChild(title)
		this.root_el.appendChild(box)
	}

	set_position(x: number, y: number, z: number): void {
		this.root_el.setAttribute('position', x + ' ' + y + ' ' + z)
	}

	add_session(document: HTMLDocument, session: Log.Session): void {
		const thumbnail_position = ((Object.keys(this.thumbnails_el).length * -0.06) - 0.03)

		const thumbnail = new SessionThumbnail(document, session)
		thumbnail.set_position(0.0, thumbnail_position, 0.0)

		this.root_el.appendChild(thumbnail.root_el)
		this.thumbnails_el[session.name] = thumbnail
	}
}
