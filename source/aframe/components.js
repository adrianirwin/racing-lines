//	Libraries
import * as _ from 'lodash';
import * as AFRAME from 'aframe';

AFRAME.registerComponent('ground_plane', {
	schema: {
		colour: {
			type: 'color', default: '#FFFFF'
		},
		count: {
			type: 'number', default: 20
		},
		gap: {
			type: 'number', default: 10
		},
		size: {
			type: 'number', default: 0.5
		}
	},

	init: function () {
		const self = this;

		self.ground_plane_dots_geometry = new THREE.BufferGeometry();

		const total_points = ((self.data.count + 1) * (self.data.count + 1)); // Adds a center point
		const span = (self.data.gap * self.data.count) / 2;
		const maximum_distance = (new THREE.Line3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(span, 0, 0))).distance();

		const vertices = [];
		const colours = [];

		const temp_colour_clamp = new THREE.Color(0x353638);
		const origin = new THREE.Vector3(0, 0, 0);
		let point = null;
		let vector_origin_to_point = null;
		let factor = null;
		let colour = null;

		for (let x = -span; x <= span; x += self.data.gap) {
			for (let z = -span; z <= span; z += self.data.gap) {
				vertices.push(x, 0, z);
				point = new THREE.Vector3(x, 0, z);

				vector_origin_to_point = new THREE.Line3(origin, point);
				factor = Math.abs(Math.min((vector_origin_to_point.distance() / maximum_distance), 1) - 1);

				colours.push(
					Math.max((0.4 * factor), temp_colour_clamp.r),
					Math.max((0.45 * factor), temp_colour_clamp.g),
					Math.max((0.65 * factor), temp_colour_clamp.b),
				);
			}
		}

		self.ground_plane_dots_geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
		self.ground_plane_dots_geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colours), 3))

		self.ground_plane_dots = new THREE.Points(
			self.ground_plane_dots_geometry,
			new THREE.PointsMaterial({ vertexColors: true, size: self.data.size, sizeAttenuation: true }),
		);
		
		self.el.setObject3D('ground_plane_dots', self.ground_plane_dots);
	},

	remove: function () {
		const self = this;

		self.el.removeObject3D('ground_plane_dots');
	}
});

AFRAME.registerComponent('racing_line', {
	schema: {
		colour: {
			type: 'color', default: '#FF0000'
		},
		coords: {
			parse: function (value) {
				if (_.isEmpty(value) === false && _.isString(value) === true) {
					return value.split(',').map(AFRAME.utils.coordinates.parse);
				} else {
					return [];
				}
			},
			default: [
				{x:  1, y: 0, z:  0},
				{x: -1, y: 0, z:  0},
				{x:  0, y: 0, z:  1},
				{x:  0, y: 0, z: -1}
			]
		},
		streamed_coords: {
			parse: function (value) {
				if (_.isEmpty(value) === false && _.isString(value) === true) {
					return value.split(',').map(AFRAME.utils.coordinates.parse);
				} else {
					return [];
				}
			},
			default: []
		},
		lap_boundaries: {
			type: 'array', default: [0]
		},
		lap_offset_length: {
			type: 'number', default: 10
		},
		length: {
			type: 'number', default: 0
		},
		reorientation_quaternion: {
			type: 'vec4', default: {x: 0, y: 0, z: 0, w: 0}
		}
	},

	init: function () {
		const self = this;

		//	Will the line 'grow' over time via the update call?
		self.will_grow = (self.data.length > 0)? true: false;

		//	Materials
		self.racing_line_material = new THREE.LineBasicMaterial({ color: self.data.colour });
		self.start_finish_material = new THREE.LineBasicMaterial({ color: '#FFFF00' });

		self.start_finish_points = [];

		//	Geometry
		self.racing_line_geometry = (self.will_grow === true)? new THREE.BufferGeometry(): new THREE.BufferGeometry();
		if (self.will_grow === true) {
			//	There seems to be something amiss with the update call that causes it to miss every other addition
			self.vertices_count = 0;

			self.positions = new Float32Array(self.data.length * 3);
			self.racing_line_geometry.addAttribute('position', new THREE.BufferAttribute(self.positions, 3));
			self.racing_line_geometry.setDrawRange(0, self.data.coords.length);
		}

		//	Create the racing line
		self.racing_line = new THREE.Line(self.racing_line_geometry, self.racing_line_material);
		self.el.setObject3D('racing_line', self.racing_line);

		//	Plot racing line vertices
		let lap_offset_increment = 0;
		self.data.coords.forEach((point, index) => {
			if (self.will_grow === true) {
				const position = (index * 3);

				self.positions[(position)] = point.x;
				self.positions[(position + 1)] = point.y;
				self.positions[(position + 2)] = point.z;

				self.vertices_count++;
			} else {
				const vertex = new THREE.Vector3(point.x, point.y, point.z);
				self.racing_line_geometry.vertices.push(vertex);
			}
		});

		//	The original GPS data is stored as lat/long, after
		//	converting to cartesian coordinates, the 'up' vector is
		//	still correct in 'globe' space. This applies the calculated
		//	rotation transformation to the racing line geometry,
		//	so 'up' for subsequent operations is now Z+.
		const rotation_matrix = new THREE.Matrix4();
		const reorientation_quaternion = new THREE.Quaternion(
			self.data.reorientation_quaternion.x,
			self.data.reorientation_quaternion.y,
			self.data.reorientation_quaternion.z,
			self.data.reorientation_quaternion.w
		);
		rotation_matrix.makeRotationFromQuaternion(reorientation_quaternion);
		self.racing_line_geometry.applyMatrix(rotation_matrix);	

		if (self.will_grow === true) {
			//	Create start/finish lines
			self.start_finish_points.forEach(function (point, index) {
				const start_finish_geometry =	new THREE.BufferGeometry();
				start_finish_geometry.vertices.push(point);
				start_finish_geometry.vertices.push(new THREE.Vector3((point.x + 20), (point.y + 20), point.z));
				self.el.setObject3D(('start_finish_line_' + index), new THREE.Line(start_finish_geometry, self.start_finish_material));
			});
		}
	},

	update: function (oldData) {
		const self = this;

		// if (
		// 	self.will_grow === true
		// 	&& _.isEmpty(oldData.coords) === false
		// 	&& _.isEmpty(self.data.coords) === false
		// ) {
		if (_.isEmpty(self.data.streamed_coords) === false) {
			// const diff = self.data.coords.slice(self.vertices_count);

			_.forEach(self.data.streamed_coords, (point, index) => {
				const vertex = new THREE.Vector3(point.x, point.y, point.z);
				const reorientation_quaternion = new THREE.Quaternion(
					self.data.reorientation_quaternion.x,
					self.data.reorientation_quaternion.y,
					self.data.reorientation_quaternion.z,
					self.data.reorientation_quaternion.w
				);
				vertex.applyQuaternion(reorientation_quaternion);

				const position = (self.vertices_count * 3);

				self.positions[(position)] = vertex.x;
				self.positions[(position + 1)] = vertex.y;
				self.positions[(position + 2)] = vertex.z;

				self.vertices_count++;
			});

			self.racing_line_geometry.setDrawRange(0, self.vertices_count);
			self.racing_line_geometry.attributes.position.needsUpdate = true;
			self.racing_line_geometry.computeBoundingSphere();
		}
	},

	remove: function () {
		const self = this;

		self.el.removeObject3D('racing_line');
	}
});

AFRAME.registerComponent('line_graph', {
	schema: {
		colour: {
			type: 'color', default: '#FFE260'
		},
		coords: {
			parse: function (value) {
				if (_.isEmpty(value) === false && _.isString(value) === true) {
					return value.split(',').map(AFRAME.utils.coordinates.parse);
				} else {
					return [];
				}
			},
			default: [
				{x:  1, y: 0, z:  0},
				{x: -1, y: 0, z:  0},
				{x:  0, y: 0, z:  1},
				{x:  0, y: 0, z: -1}
			]
		},
		streamed_coords: {
			parse: function (value) {
				if (_.isEmpty(value) === false && _.isString(value) === true) {
					return value.split(',').map(AFRAME.utils.coordinates.parse);
				} else {
					return [];
				}
			},
			default: []
		},
		length: {
			type: 'number', default: 0
		},
		reorientation_quaternion: {
			type: 'vec4', default: {x: 0, y: 0, z: 0, w: 0}
		}
	},

	init: function () {
		const self = this;

		//	Materials
		self.value_material = new THREE.LineBasicMaterial({ color: self.data.colour });

		//	Geometry
		self.value_geometry = new THREE.BufferGeometry();

		//	There seems to be something amiss with the update call that causes it to miss every other addition
		self.point_count = 0;

		self.value_positions = new Float32Array(self.data.length * 3);
		self.value_geometry.addAttribute('position', new THREE.BufferAttribute(self.value_positions, 3));

		//	Create the value line
		self.value_line = new THREE.Line(self.value_geometry, self.value_material);
		self.el.setObject3D('value_line', self.value_line);

		//	Plot value line vertices
		self.data.coords.forEach((point, index) => {
			const position = (index * 3);

			self.value_positions[(position)] = point.x;
			self.value_positions[(position + 1)] = point.y;
			self.value_positions[(position + 2)] = point.z;

			self.point_count++;
		});
		self.value_geometry.setDrawRange(0, self.point_count);

		//	The original GPS data is stored as lat/long, after
		//	converting to cartesian coordinates, the 'up' vector is
		//	still correct in 'globe' space. This applies the calculated
		//	rotation transformation to the racing line geometry,
		//	so 'up' for subsequent operations is now Z+.
		const rotation_matrix = new THREE.Matrix4();
		const reorientation_quaternion = new THREE.Quaternion(
			self.data.reorientation_quaternion.x,
			self.data.reorientation_quaternion.y,
			self.data.reorientation_quaternion.z,
			self.data.reorientation_quaternion.w
		);
		rotation_matrix.makeRotationFromQuaternion(reorientation_quaternion);
		self.value_geometry.applyMatrix(rotation_matrix);
	},

	update: function (oldData) {
		const self = this;

		// if (
		// 	_.isEmpty(oldData.coords) === false
		// 	&& _.isEmpty(self.data.coords) === false
		// ) {
		if (_.isEmpty(self.data.streamed_coords) === false) {

			// const diff = self.data.coords.slice(self.point_count);

			// _.forEach(diff, (point, index) => {
			_.forEach(self.data.streamed_coords, (point, index) => {
				const vertex = new THREE.Vector3(point.x, point.y, point.z);
				const reorientation_quaternion = new THREE.Quaternion(
					self.data.reorientation_quaternion.x,
					self.data.reorientation_quaternion.y,
					self.data.reorientation_quaternion.z,
					self.data.reorientation_quaternion.w
				);
				vertex.applyQuaternion(reorientation_quaternion);

				const position = (self.point_count * 3);

				self.value_positions[(position)] = vertex.x;
				self.value_positions[(position + 1)] = vertex.y;
				self.value_positions[(position + 2)] = vertex.z;

				self.point_count++;
			});

			self.value_geometry.setDrawRange(0, self.point_count);
			self.value_geometry.attributes.position.needsUpdate = true;
			self.value_geometry.computeBoundingSphere();
			self.value_geometry.computeBoundingBox();
		}
	},

	remove: function () {
		const self = this;

		self.el.removeObject3D('racing_line');
	}
});

AFRAME.registerComponent('filled_graph', {
	schema: {
		colour: {
			type: 'color', default: '#E5C167'
		},
		coords: {
			parse: function (value) {
				if (_.isEmpty(value) === false && _.isString(value) === true) {
					return value.split(',').map(AFRAME.utils.coordinates.parse);
				} else {
					return [];
				}
			},
			default: [
				{x:  1, y: 0, z:  0},
				{x:  1, y: 0, z:  1},
				{x: -1, y: 0, z:  0},
				{x: -1, y: 0, z:  1},
				{x: -1, y: 0, z:  0},
				{x:  1, y: 0, z:  1}
			]
		},
		streamed_coords: {
			parse: function (value) {
				if (_.isEmpty(value) === false && _.isString(value) === true) {
					return value.split(',').map(AFRAME.utils.coordinates.parse);
				} else {
					return [];
				}
			},
			default: []
		},
		length: {
			type: 'number', default: 0
		},
		reorientation_quaternion: {
			type: 'vec4', default: {x: 0, y: 0, z: 0, w: 0}
		}
	},

	init: function () {
		const self = this;

		//	Materials
		self.fill_material = new THREE.MeshBasicMaterial({
			color: self.data.colour,
			transparent: true,
			opacity: 0.5,
			side: THREE.DoubleSide,
			depthWrite: false
		});

		//	Geometry
		self.fill_geometry = new THREE.BufferGeometry();

		//	There seems to be something amiss with the update call that causes it to miss every other addition
		self.point_count = 0;
		self.indicies_per_segment = 6;

		self.fill_positions = new Float32Array(self.data.length * self.indicies_per_segment);
		self.fill_geometry.addAttribute('position', new THREE.BufferAttribute(self.fill_positions, 3));

		self.fill_indicies = new Uint32Array((self.data.length - 1) * self.indicies_per_segment);
		for (let i = 0, l = (self.data.length - 1); i < l; i++) {
			self.fill_indicies[((i * self.indicies_per_segment) + 0)] =  ((i * 2) + 0);
			self.fill_indicies[((i * self.indicies_per_segment) + 1)] =  ((i * 2) + 1);
			self.fill_indicies[((i * self.indicies_per_segment) + 2)] =  ((i * 2) + 2);
			self.fill_indicies[((i * self.indicies_per_segment) + 3)] =  ((i * 2) + 3);
			self.fill_indicies[((i * self.indicies_per_segment) + 4)] =  ((i * 2) + 2);
			self.fill_indicies[((i * self.indicies_per_segment) + 5)] =  ((i * 2) + 1);
		}
		self.fill_geometry.setIndex(new THREE.BufferAttribute(self.fill_indicies, 1));

		//	Create the filled surface
		self.filled_surface = new THREE.Mesh(self.fill_geometry, self.fill_material);
		self.el.setObject3D('filled_surface', self.filled_surface);

		//	Plot value filled surface vertices
		self.data.coords.forEach((point, index) => {
			const position = (index * 3);

			self.fill_positions[(position)] = point.x;
			self.fill_positions[(position + 1)] = point.y;
			self.fill_positions[(position + 2)] = point.z;

			self.point_count++;
		});
		self.fill_geometry.setDrawRange(0, (((self.point_count - 2) * (Math.round(self.indicies_per_segment / 2))) - (((self.point_count - 2) * (Math.round(self.indicies_per_segment / 2))) % (Math.round(self.indicies_per_segment / 2)))));

		//	The original GPS data is stored as lat/long, after
		//	converting to cartesian coordinates, the 'up' vector is
		//	still correct in 'globe' space. This applies the calculated
		//	rotation transformation to the racing line geometry,
		//	so 'up' for subsequent operations is now Z+.
		const rotation_matrix = new THREE.Matrix4();
		const reorientation_quaternion = new THREE.Quaternion(
			self.data.reorientation_quaternion.x,
			self.data.reorientation_quaternion.y,
			self.data.reorientation_quaternion.z,
			self.data.reorientation_quaternion.w
		);
		rotation_matrix.makeRotationFromQuaternion(reorientation_quaternion);
		self.fill_geometry.applyMatrix(rotation_matrix);
	},

	update: function (oldData) {
		const self = this;

		if (_.isEmpty(self.data.streamed_coords) === false) {
			_.forEach(self.data.streamed_coords, (point, index) => {
				const vertex = new THREE.Vector3(point.x, point.y, point.z);
				const reorientation_quaternion = new THREE.Quaternion(
					self.data.reorientation_quaternion.x,
					self.data.reorientation_quaternion.y,
					self.data.reorientation_quaternion.z,
					self.data.reorientation_quaternion.w
				);
				vertex.applyQuaternion(reorientation_quaternion);

				const position = (self.point_count * 3);

				self.fill_positions[(position)] = vertex.x;
				self.fill_positions[(position + 1)] = vertex.y;
				self.fill_positions[(position + 2)] = vertex.z;

				self.point_count++;
			});

			self.fill_geometry.setDrawRange(0, (((self.point_count - 2) * (Math.round(self.indicies_per_segment / 2))) - (((self.point_count - 2) * (Math.round(self.indicies_per_segment / 2))) % (Math.round(self.indicies_per_segment / 2)))));
			self.fill_geometry.attributes.position.needsUpdate = true;
			self.fill_geometry.computeBoundingSphere();
			self.fill_geometry.computeBoundingBox();
		}
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
		self.racing_dots_geometry = new THREE.BufferGeometry();
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
		self.smoothing_geometry = new THREE.BufferGeometry();
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

// AFRAME.registerComponent('grabbable', {
// 	schema: {
// 		hand: {type: 'selector', default: '#left_hand'}
// 	},
// 	init: function () {
// 		const self = this;

// 		window.console.info('grabbable', self, self.data.hand);


// 		window.console.info(self.el);
// 		self.hand = self.data.hand;
// 		self.thumbstick = _.get(self.hand, 'components["tracked-controls"].axis', null);
// 		self.el.setAttribute('rotation', { x: 0, y: 0, z: 0 });
// 	},

// 	tick: function (time, timeDelta) {
// 		const self = this;

// 		if (self.thumbstick !== null) {
// 			window.console.info(Math.round(time), self.thumbstick[0], self.thumbstick[1]);

// 			const rotation = self.el.getAttribute('rotation', { x: 0, y: 0, z: 0 });
// 			rotation.y += (self.thumbstick[0] * 10);
// 			self.el.setAttribute('rotation', rotation);
// 			// this.el.setAttribute();
// 		}
// 	}
// });

export {};