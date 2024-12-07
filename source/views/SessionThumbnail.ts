import * as AFRAME from 'aframe'
import { Log } from './../models/Logs'

export default class SessionThumbnail {
	root_el: AFRAME.Entity
	session_el: AFRAME.Entity

	session: Log.Session

	constructor(document: HTMLDocument, session: Log.Session) {
		this.session = session

		this.root_el = document.createElement('a-entity')
		this.root_el.setAttribute('position', '0.0 0.0 0.0')

		this.session_el = document.createElement('a-entity')
		this.session_el.setAttribute('position', '0.0 -0.032 0.0')
		this.session_el.setAttribute('session_summary', { session: this.session, progress_bar_scale: 0.3 })

		const name = document.createElement('a-entity')
		name.setAttribute('position', '0.0 0.0 0.0')
		name.setAttribute('text', {
			'width': 0.35,
			'anchor': 'left',
			'color': '#F2B718',
			'value': this.session.name,
		})

		const laps = document.createElement('a-entity')
		laps.setAttribute('position', '0.0012 -0.017 0.0')
		laps.setAttribute('text', {
			'width': 0.3,
			'anchor': 'left',
			'color': '#D1002A',
			'font': 'monoid',
			'value': 'LAPS [' + this.session.total_laps + ']',
		})

		const box = document.createElement('a-plane')
		box.setAttribute('position', '0.15 -0.015 -0.0025')
		box.setAttribute('width', 0.32)
		box.setAttribute('height', 0.055)
		box.setAttribute('color', '#262626')


		this.root_el.appendChild(this.session_el)
		this.root_el.appendChild(name)
		this.root_el.appendChild(laps)
		this.root_el.appendChild(box)

		this.session.$smoothing_progress.subscribe((progress: number) => this.progress = progress)
	}

	set_position(x: number, y: number, z: number): void {
		this.root_el.setAttribute('position', x + ' ' + y + ' ' + z)
	}

	set progress(progress: number) {
		this.session_el.setAttribute('session_summary', { progress })
	}
}
