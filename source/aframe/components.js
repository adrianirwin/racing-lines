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
			type: 'array', default: [0]
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

		//	Materials
		self.racing_line_material =		new THREE.LineBasicMaterial({ color: self.data.colour });
		self.start_finish_material =	new THREE.LineBasicMaterial({ color: '#FFFF00' });
	},

	update: function (oldData) {
		const self = this;

		self.start_finish_points = [];

		//	Create the racing line
		self.racing_line_geometry =		new THREE.Geometry();
		self.racing_line =				new THREE.Line(self.racing_line_geometry, self.racing_line_material);
		self.el.setObject3D('racing_line', self.racing_line);

		//	Plot racing line vertices
		var lap_offset_increment = 0;
		self.data.coords.forEach(function (point, index) {
			var start_finish =			false;
			var vertex =				new THREE.Vector3(point.x, point.y, point.z);

			//	Calculate vertical offset
			if (_.indexOf(self.data.lap_boundaries, String(index)) !== -1) {
				lap_offset_increment++;
				start_finish = true;
			}
			var lap_offset_vector =  	new THREE.Vector3(
				self.data.lap_offset_vector.x,
				self.data.lap_offset_vector.y,
				self.data.lap_offset_vector.z
			);
			lap_offset_vector.multiplyScalar(lap_offset_increment * self.data.lap_offset_length);

			//	Apply the offset and add the raw vertex to the racing line
			vertex.add(lap_offset_vector);
			self.racing_line_geometry.vertices.push(vertex);
		});

		//	The original GPS data is stored as lat/long, after
		//	converting to cartesian coordinates, the 'up' vector is
		//	still correct in 'globe' space. This applies the calculated
		//	rotation transformation to the racing line geometry,
		//	so 'up' for subsequent operations is now Z+.
		var rotation_matrix =			new THREE.Matrix4();
		var reorientation_quaternion =	new THREE.Quaternion(
			self.data.reorientation_quaternion.x,
			self.data.reorientation_quaternion.y,
			self.data.reorientation_quaternion.z,
			self.data.reorientation_quaternion.w
		);
		rotation_matrix.makeRotationFromQuaternion(reorientation_quaternion);
		self.racing_line_geometry.applyMatrix(rotation_matrix);	

		//	Create start/finish lines
		self.start_finish_points.forEach(function (point, index) {
			var start_finish_geometry =	new THREE.Geometry();
			start_finish_geometry.vertices.push(point);
			start_finish_geometry.vertices.push(new THREE.Vector3((point.x + 20), (point.y + 20), point.z));
			self.el.setObject3D(('start_finish_line_' + index), new THREE.Line(start_finish_geometry, self.start_finish_material));
		});
	},

	remove: function () {
		const self = this;

		self.el.removeObject3D('racing_line');
	}
});

AFRAME.registerComponent('racing_dots', {
	schema: {
		colour: {
			type: 'color', default: '#FF88FF'
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
		reorientation_quaternion: {
			type: 'vec4', default: {x: 0, y: 0, z: 0, w: 0}
		}
	},

	init: function () {
		const self = this;

		//	Materials
		self.racing_dots_material = new THREE.PointsMaterial({ color: self.data.colour, size: 4.0, sizeAttenuation: false });
	},

	update: function (oldData) {
		const self = this;

		self.start_finish_points = [];

		//	Create the racing line
		self.racing_dots_geometry = new THREE.Geometry();
		self.racing_dots = new THREE.Points(self.racing_dots_geometry, self.racing_dots_material);
		self.el.setObject3D('racing_dots', self.racing_dots);

		//	Plot racing line vertices
		self.data.coords.forEach(function (point, index) {
			self.racing_dots_geometry.vertices.push(new THREE.Vector3(point.x, point.y, point.z));
		});

		//	The original GPS data is stored as lat/long, after
		//	converting to cartesian coordinates, the 'up' vector is
		//	still correct in 'globe' space. This applies the calculated
		//	rotation transformation to the racing line geometry,
		//	so 'up' for subsequent operations is now Z+.
		var rotation_matrix = new THREE.Matrix4();
		var reorientation_quaternion = new THREE.Quaternion(
			self.data.reorientation_quaternion.x,
			self.data.reorientation_quaternion.y,
			self.data.reorientation_quaternion.z,
			self.data.reorientation_quaternion.w
		);
		rotation_matrix.makeRotationFromQuaternion(reorientation_quaternion);
		self.racing_dots_geometry.applyMatrix(rotation_matrix);	
	},

	remove: function () {
		const self = this;

		self.el.removeObject3D('racing_dots');
	}
});

AFRAME.registerComponent('smoothing_inspector', {
	schema: {
		colour: {
			type: 'color', default: '#FFFF00'
		},
		coords0: {
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
		coords1: {
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
		coords2: {
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
		coords3: {
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
		coords4: {
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
		coords5: {
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
		reorientation_quaternion: {
			type: 'vec4', default: {x: 0, y: 0, z: 0, w: 0}
		}
	},

	init: function () {
		const self = this;

		//	Materials
		self.smoothing_material = new THREE.LineBasicMaterial({ color: self.data.colour });
	},

	update: function (oldData) {
		const self = this;

		self.start_finish_points = [];

		//	Create the racing line
		self.smoothing_geometry = new THREE.Geometry();
		self.smoothing_line_segments = new THREE.LineSegments(self.smoothing_geometry, self.smoothing_material);
		self.el.setObject3D('smoothing_inspector', self.smoothing_line_segments);

		//	Plot racing line vertices
		self.data.coords0.forEach(function (point, index) {
			self.smoothing_geometry.vertices.push(new THREE.Vector3(point.x, point.y, point.z));
			self.smoothing_geometry.vertices.push(new THREE.Vector3(self.data.coords1[index].x, self.data.coords1[index].y, self.data.coords1[index].z));
			self.smoothing_geometry.vertices.push(new THREE.Vector3(self.data.coords1[index].x, self.data.coords1[index].y, self.data.coords1[index].z));
			self.smoothing_geometry.vertices.push(new THREE.Vector3(self.data.coords2[index].x, self.data.coords2[index].y, self.data.coords2[index].z));
			self.smoothing_geometry.vertices.push(new THREE.Vector3(self.data.coords2[index].x, self.data.coords2[index].y, self.data.coords2[index].z));
			self.smoothing_geometry.vertices.push(new THREE.Vector3(self.data.coords3[index].x, self.data.coords3[index].y, self.data.coords3[index].z));
			self.smoothing_geometry.vertices.push(new THREE.Vector3(self.data.coords3[index].x, self.data.coords3[index].y, self.data.coords3[index].z));
			self.smoothing_geometry.vertices.push(new THREE.Vector3(self.data.coords4[index].x, self.data.coords4[index].y, self.data.coords4[index].z));
			self.smoothing_geometry.vertices.push(new THREE.Vector3(self.data.coords4[index].x, self.data.coords4[index].y, self.data.coords4[index].z));
			self.smoothing_geometry.vertices.push(new THREE.Vector3(self.data.coords5[index].x, self.data.coords5[index].y, self.data.coords5[index].z));
		});

		//	The original GPS data is stored as lat/long, after
		//	converting to cartesian coordinates, the 'up' vector is
		//	still correct in 'globe' space. This applies the calculated
		//	rotation transformation to the racing line geometry,
		//	so 'up' for subsequent operations is now Z+.
		var rotation_matrix = new THREE.Matrix4();
		var reorientation_quaternion = new THREE.Quaternion(
			self.data.reorientation_quaternion.x,
			self.data.reorientation_quaternion.y,
			self.data.reorientation_quaternion.z,
			self.data.reorientation_quaternion.w
		);
		rotation_matrix.makeRotationFromQuaternion(reorientation_quaternion);
		self.smoothing_geometry.applyMatrix(rotation_matrix);	
	},

	remove: function () {
		const self = this;

		self.el.removeObject3D('smoothing_inspector');
	}
});

export {};