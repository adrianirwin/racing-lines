import * as _ from 'lodash';
import * as AFRAME from 'aframe';

AFRAME.registerComponent('racing_line', {
	schema: {
		colour: {
			type: 'color', default: '#FF0000'
		},
		coords: {
			parse: function (value) {
				return value.split(',').map(AFRAME.utils.coordinates.parse);
			},
			default: [
				{x:  1, y: 0, z:  0},
				{x: -1, y: 0, z:  0},
				{x:  0, y: 0, z:  1},
				{x:  0, y: 0, z: -1}
			]
		},
		lap_boundaries: {
			type: 'array', default: [0, 2]
		},
		lap_offset_vector: {
			type: 'vec3', default: {x: 0, y: 0, z: 1}
		},
		lap_offset_length: {
			type: 'number', default: 10
		},
		reorientation_quaternion: {
			type: 'vec4', default: {x: 0, y: 0, z: 0, w: 0}
		}
	},

	init: function () {
		const self = this;
	},

	update: function (oldData) {
		const self = this;

		self.start_finish_points = [];

		//	Materials
		self.racing_line_material = new THREE.LineBasicMaterial({ color: self.data.colour });
		self.start_finish_material = new THREE.LineBasicMaterial({ color: '#FFFF00' });

		//	Create the racing line
		self.racing_line_geometry = new THREE.Geometry();
		self.racing_line = new THREE.Line(self.racing_line_geometry, self.racing_line_material);
		self.el.setObject3D('racing_line', self.racing_line);

		//	Plot racing line vertices
		var lap_offset_increment = 0;
		self.data.coords.forEach(function (point, index) {
			var start_finish = false;
			var vertex = new THREE.Vector3(point.x, point.y, point.z);

			//	Calculate vertical offset
			if (_.indexOf(self.data.lap_boundaries, String(index)) !== -1) {
				lap_offset_increment++;
				start_finish = true;
			}
			var lap_offset_vector =  new THREE.Vector3(
				self.data.lap_offset_vector.x,
				self.data.lap_offset_vector.y,
				self.data.lap_offset_vector.z
			);
			lap_offset_vector.multiplyScalar((lap_offset_increment - 1) * self.data.lap_offset_length);

			vertex.add(lap_offset_vector);

			if (start_finish === true) {
				self.start_finish_points.push(vertex);
			}

			self.racing_line_geometry.vertices.push(vertex);
		});

		//	Re-orient the rotation due to previous rotation from global to cartesian coordinates
		var rotation_matrix = new THREE.Matrix4();
		var reorientation_quaternion = new THREE.Quaternion(
			self.data.reorientation_quaternion.x,
			self.data.reorientation_quaternion.y,
			self.data.reorientation_quaternion.z,
			self.data.reorientation_quaternion.w
		);
		rotation_matrix.makeRotationFromQuaternion(reorientation_quaternion);
		self.racing_line_geometry.applyMatrix(rotation_matrix);	

		//	Create start/finish lines
		self.start_finish_points.forEach(function (point, index) {
			var start_finish_geometry = new THREE.Geometry();
			start_finish_geometry.vertices.push(point);
			start_finish_geometry.vertices.push(new THREE.Vector3((point.x + 20), (point.y + 20), point.z));
			self.el.setObject3D(('start_finish_line_' + index), new THREE.Line(start_finish_geometry, self.start_finish_material));
		});
	},

	remove: function () {
		const self = this;

		self.el.removeObject3D('racing_line');
		// self.el.removeObject3D('line2');
	}
});

export {};