// AFRAME.registerComponent('grabbable', {
// 	schema: {
// 		hand: {type: 'selector', default: '#left_hand'}
// 	},

// 	init: () => {
// 		window.console.info('grabbable', this, this.data.hand)

// 		window.console.info(this.el)
// 		this.hand = this.data.hand
// 		this.thumbstick = _.get(this.hand, 'components["tracked-controls"].axis', null)
// 		this.el.setAttribute('rotation', { x: 0, y: 0, z: 0 })
// 	},

// 	tick: (time, timeDelta) => {
// 		if (this.thumbstick !== null) {
// 			window.console.info(Math.round(time), this.thumbstick[0], this.thumbstick[1])

// 			const rotation = this.el.getAttribute('rotation', { x: 0, y: 0, z: 0 })
// 			rotation.y += (this.thumbstick[0] * 10)
// 			this.el.setAttribute('rotation', rotation)
// 			// this.el.setAttribute()
// 		}
// 	},
// })
