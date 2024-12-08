import * as AFRAME from 'aframe'
import {
	Log,
	RacingLinePoint,
} from './../models/Logs'

export default class SessionThumbnail {
	root_el: AFRAME.Entity
	session_el: AFRAME.Entity

	session: Log.Session
	render_lap_callback: (lap_points: Array<RacingLinePoint>, session: Log.Session) => void

	constructor(document: HTMLDocument, session: Log.Session, render_lap_callback: (lap_points: Array<RacingLinePoint>, session: Log.Session) => void) {
		this.session = session
		this.render_lap_callback = render_lap_callback

		this.root_el = document.createElement('a-entity')
		this.root_el.setAttribute('position', '0.0 0.0 0.0')

		//	Progress Bar
		this.session_el = document.createElement('a-entity')
		this.session_el.setAttribute('position', '0.0 -0.054 0.0')
		this.session_el.setAttribute('session_summary', { session: this.session, progress_bar_scale: 0.3 })

		//	Session Name.log
		const name = document.createElement('a-entity')
		name.setAttribute('position', '0.0 0.0 0.0')
		name.setAttribute('text', {
			'width': 0.35,
			'anchor': 'left',
			'color': '#F2B718',
			'value': this.session.name,
		})

		//	LAPS [##]
		const laps = document.createElement('a-entity')
		laps.setAttribute('position', '0.0012 -0.017 0.0')
		laps.setAttribute('text', {
			'width': 0.3,
			'anchor': 'left',
			'color': '#D1002A',
			'font': 'monoid',
			'value': 'LAPS [' + this.session.total_laps + ']',
		})

		//	Lap Boxes
		const box_size = 0.015
		const lap_boxes = new Array<AFRAME.Entity>()
		for (let i = 0, l = this.session.total_laps; i < l; i++) {
			const lap_box = document.createElement('a-plane')
			lap_box.setAttribute('position', (((box_size + 0.005) * i) + 0.01) + ' -0.038 0.0')
			lap_box.setAttribute('width', box_size)
			lap_box.setAttribute('height', box_size)
			lap_box.setAttribute('color', '#383838')
			lap_box.setAttribute('roughness', 1.0)
			lap_box.classList.add('raycastable')

			//	Click Handling
			lap_box.addEventListener('click', (e: Event) => lap_box.is('selected') === true ? lap_box.removeState('selected') : lap_box.addState('selected'))

			lap_box.addEventListener('stateadded', (e: any) => {
				switch (e.detail) {
					case 'selected':
						lap_box.setAttribute('color', '#D1002A')
						this.render_lap_callback(this.session.points_for_lap(i + 1), this.session)
						break
				}
			})

			lap_box.addEventListener('stateremoved', (e: any) => {
				switch (e.detail) {
					case 'selected':
						lap_box.setAttribute('color', '#383838')
						break
				}
			})

			lap_boxes.push(lap_box)
		}

		//	Background
		const box = document.createElement('a-plane')
		box.setAttribute('position', '0.15 -0.025 -0.0025')
		box.setAttribute('width', 0.32)
		box.setAttribute('height', 0.075)
		box.setAttribute('color', '#262626')
		box.setAttribute('roughness', 1.0)

		//	Assemble the elements
		this.root_el.appendChild(this.session_el)
		this.root_el.appendChild(name)
		this.root_el.appendChild(laps)
		lap_boxes.forEach((lap_box: AFRAME.Entity) => this.root_el.appendChild(lap_box))
		this.root_el.appendChild(box)

		//	Smoothing progerss bar
		this.session.$smoothing_progress.subscribe((progress: number) => this.progress = progress)
	}

	set_position(x: number, y: number, z: number): void {
		this.root_el.setAttribute('position', x + ' ' + y + ' ' + z)
	}

	set progress(progress: number) {
		this.session_el.setAttribute('session_summary', { progress })
	}
}
