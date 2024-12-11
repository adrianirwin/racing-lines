import * as AFRAME from 'aframe'
import {
	Log,
	RacingLinePoint,
} from './../models/Logs'
import LapGraph from './LapGraph'

export default class SessionThumbnail {
	root_el: AFRAME.Entity
	session_el: AFRAME.Entity
	graphs_root_el: AFRAME.Entity

	lap_graphs: Array<LapGraph>
	session: Log.Session

	constructor(document: HTMLDocument, session: Log.Session, graphs_root_el: AFRAME.Entity) {
		this.session = session
		this.graphs_root_el = graphs_root_el

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
		this.lap_graphs = new Array<LapGraph>()
		for (let i = 0, l = this.session.total_laps; i < l; i++) {
			const lap_box = document.createElement('a-plane')
			lap_boxes[i] = lap_box

			lap_box.setAttribute('position', (((box_size + 0.005) * i) + 0.01) + ' -0.038 0.0')
			lap_box.setAttribute('width', box_size)
			lap_box.setAttribute('height', box_size)
			lap_box.setAttribute('color', '#292929')
			lap_box.setAttribute('roughness', 1.0)

			lap_box.addEventListener('stateadded', (e: any) => {
				switch (e.detail) {
					case 'smoothed':
						lap_box.setAttribute('color', '#383838')
						break
					case 'selected':
						lap_box.setAttribute('color', '#D1002A')

						const lap_graph = new LapGraph(document, this.session.points_for_lap(i + 1), this.session.vector_to_center, 0.01)
						this.lap_graphs[i] = lap_graph
						this.graphs_root_el.appendChild(lap_graph.root_el)
						break
				}
			})

			lap_box.addEventListener('stateremoved', (e: any) => {
				switch (e.detail) {
					case 'selected':
						lap_box.setAttribute('color', '#383838')

						this.lap_graphs[i].root_el.parentElement?.removeChild(this.lap_graphs[i].root_el)
						break
				}
			})
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

		//	As smoothing is completed, enable interactions
		this.session.$smoothed_up_to_lap.subscribe((lap: number) => {
			if (lap > 0) {
				for (let i_l = 0, l_l = lap; i_l < l_l; i_l++) {
					if (lap_boxes[i_l].is('smoothed') === false) {
						lap_boxes[i_l].addState('smoothed')
						lap_boxes[i_l].classList.add('raycastable')
						lap_boxes[i_l].addEventListener('click', (e: Event) => lap_boxes[i_l].is('selected') === true ? lap_boxes[i_l].removeState('selected') : lap_boxes[i_l].addState('selected'))
					}
				}
			}
		})
	}

	set_position(x: number, y: number, z: number): void {
		this.root_el.setAttribute('position', x + ' ' + y + ' ' + z)
	}

	set progress(progress: number) {
		this.session_el.setAttribute('session_summary', { progress })
	}
}
