var AFRAME = require('aframe');

AFRAME.registerComponent('racing_line', {
	schema: {
		colour: {type: 'color', default: '#F00'},
		coords: {
			parse: function (value) {
				return value.split(',').map(AFRAME.utils.coordinates.parse);
			},
			default: [
				{'x':  1, 'y': 0, 'z':  0},
				{'x': -1, 'y': 0, 'z':  0},
				{'x':  0, 'y': 0, 'z':  1},
				{'x':  0, 'y': 0, 'z': -1}
			]
		}
	},

	/**
	* Initial creation and setting of the mesh.
	*/
	init: function () {
		const self = this;

		// // Create geometry.
		// this.geometry = new THREE.BoxBufferGeometry(data.width, data.height, data.depth);

		// // Create material.
		// this.material = new THREE.MeshStandardMaterial({color: data.color});

		// // Create mesh.
		// this.mesh = new THREE.Mesh(this.geometry, this.material);

		// // Set mesh on entity.
		// el.setObject3D('mesh', this.mesh);

		self.material = new THREE.LineBasicMaterial({ color: self.data.colour });

		self.geometry = new THREE.Geometry();

		self.data.coords.forEach(function (point) {
			self.geometry.vertices.push(new THREE.Vector3(point.x, point.y, point.z));
		});

		self.line = new THREE.Line(self.geometry, self.material);

		self.el.setObject3D('line', self.line);
	}
});

export {};