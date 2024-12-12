import * as AFRAME from 'aframe'
import { Subject } from 'rxjs'
import { Log, RacingLinePoint } from './../models/Logs'
import { State } from './../models/States'
import LapGraphs from './LapGraphs'

export default class SessionThumbnail {
	root_el: AFRAME.Entity
	session_el: AFRAME.Entity
	graphs_root_el: AFRAME.Entity

	lap_graphs: Array<LapGraphs>
	session: Log.Session

	$delete: Subject<void>

	constructor(document: HTMLDocument, session: Log.Session, graphs_root_el: AFRAME.Entity) {
		this.session = session
		this.graphs_root_el = graphs_root_el

		this.$delete = new Subject()

		this.root_el = document.createElement('a-entity')
		this.root_el.setAttribute('position', '0.0 0.0 0.0')

		//	Progress Bar
		this.session_el = document.createElement('a-entity')
		this.session_el.setAttribute('position', '0.0 -0.032 0.0')
		this.session_el.setAttribute('session_summary', { session: this.session, progress_bar_scale: 0.3 })

		//	Session Name.log
		const name = document.createElement('a-entity')
		name.setAttribute('position', '0.0 0.0 0.0')
		name.setAttribute('text', {
			width: 0.35,
			anchor: 'left',
			color: '#F2B718',
			value: this.session.name,
		})

		//	LAPS [##]
		const laps = document.createElement('a-entity')
		laps.setAttribute('position', '0.0012 -0.017 0.0')
		laps.setAttribute('text', {
			width: 0.3,
			anchor: 'left',
			color: '#D1002A',
			font: 'monoid',
			value: 'LAPS [' + this.session.total_laps + ']',
		})

		//	Lap Boxes
		const box_size = 0.015
		const lap_boxes = new Array<AFRAME.Entity>()
		this.lap_graphs = new Array<LapGraphs>()
		for (let i = 0, l = this.session.total_laps; i < l; i++) {
			const lap_box_offset = (((box_size + 0.005) * i) + 0.01)

			const lap_box = document.createElement('a-plane')
			lap_box.setAttribute('position', lap_box_offset + ' -0.0485 0.0')
			lap_box.setAttribute('width', box_size)
			lap_box.setAttribute('height', box_size)
			lap_box.setAttribute('color', '#292929')
			lap_box.setAttribute('roughness', 1.0)

			lap_box.addEventListener('stateadded', (e: any) => {
				switch (e.detail) {
					case 'cursor-hovered':
						if (lap_box.is('smoothed') === true && lap_box.is('selected') === false) {
							lap_box.setAttribute('color', '#590D0D')
						}
						break
					case 'smoothed':
						lap_box.setAttribute('color', '#383838')
						break
					case 'selected':
						lap_box.setAttribute('color', '#D1002A')

						const lap_graph = new LapGraphs(document, this.session.name, this.session.points_for_lap(i + 1), this.session.vector_to_center, 0.01)
						this.lap_graphs[i] = lap_graph
						this.graphs_root_el.appendChild(lap_graph.root_el)
						break
				}
			})

			lap_box.addEventListener('stateremoved', (e: any) => {
				switch (e.detail) {
					case 'cursor-hovered':
						if (lap_box.is('smoothed') === true && lap_box.is('selected') === false) {
							lap_box.setAttribute('color', '#383838')
						}
						break
					case 'selected':
						if (lap_box.is('cursor-hovered') === true) {
							lap_box.setAttribute('color', '#590D0D')
						}
						else {
							lap_box.setAttribute('color', '#383838')
						}

						this.lap_graphs[i].root_el.parentElement?.removeChild(this.lap_graphs[i].root_el)
						break
				}
			})

			//	Lap Time
			const lap_time = document.createElement('a-entity')
			lap_time.setAttribute('position', '0.001 -0.002 0.003')
			lap_time.setAttribute('rotation', '-21.35 -23.93 -27.80')
			lap_time.setAttribute('text', {
				width: 0.15,
				anchor: 'left',
				color: '#FFFFFF',
				font: 'kelsonsans',
				letterSpacing: 2.0,
				value: this.session.time_for_lap_formatted(i + 1)
			})

			lap_box.appendChild(lap_time)

			lap_boxes[i] = lap_box
		}

		//	Unload Button
		const close_box = document.createElement('a-plane')
		close_box.setAttribute('position', '-0.028 0.000 -0.0025')
		close_box.setAttribute('width', 0.025)
		close_box.setAttribute('height', 0.025)
		close_box.setAttribute('color', '#262626')
		close_box.setAttribute('roughness', 1.0)
		close_box.setAttribute('side', 'double')
		close_box.classList.add('raycastable')
		close_box.addEventListener('click', (e: Event) => {
			State.Global.getInstance().delete_session(this.session)
		})
		close_box.addEventListener('stateadded', (e: any) => {
			switch (e.detail) {
				case 'cursor-hovered':
					close_box.setAttribute('color', '#590D0D')
					break
			}
		})

		close_box.addEventListener('stateremoved', (e: any) => {
			switch (e.detail) {
				case 'cursor-hovered':
					close_box.setAttribute('color', '#262626')
					break
			}
		})

		//	Background
		const box = document.createElement('a-plane')
		box.setAttribute('position', '0.15 -0.025 -0.0025')
		box.setAttribute('width', 0.32)
		box.setAttribute('height', 0.075)
		box.setAttribute('color', '#262626')
		box.setAttribute('roughness', 1.0)
		box.setAttribute('side', 'double')

		//	Assemble the elements
		this.root_el.appendChild(this.session_el)
		this.root_el.appendChild(name)
		this.root_el.appendChild(laps)
		lap_boxes.forEach((lap_box: AFRAME.Entity) => this.root_el.appendChild(lap_box))
		this.root_el.appendChild(close_box)
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
						lap_boxes[i_l].addEventListener('click', (e: Event) => {
							lap_boxes[i_l].is('selected') === true ? lap_boxes[i_l].removeState('selected') : lap_boxes[i_l].addState('selected')
						})
					}
				}
			}
		})
	}

	set progress(progress: number) {
		this.session_el.setAttribute('session_summary', { progress })
	}
}
