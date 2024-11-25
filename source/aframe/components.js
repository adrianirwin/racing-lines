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
			new THREE.PointsMaterial({
				vertexColors: true,
				size: self.data.size,
				sizeAttenuation: true
			}),
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
				{x:  0, y: 0, z: -1},
			],
		},
		streamed_coords: {
			type: 'string', default: '',
		},
		streamed_index: {
			type: 'number', default: 0,
		},
		lap_boundaries: {
			type: 'array', default: [0],
		},
		lap_offset_length: {
			type: 'number', default: 10,
		},
		length: {
			type: 'number', default: 0,
		},
		reorientation_quaternion: {
			type: 'vec4', default: {x: 0, y: 0, z: 0, w: 0},
		},
	},

	init: function () {
		const self = this;

		//	Will the line 'grow' over time via the update call?
		self.will_grow = (self.data.length > 0)? true: false;

		//	Materials
		self.racing_line_material = new THREE.LineBasicMaterial({
			color: self.data.colour,
			linewidth: 1,
		});
		self.start_finish_material = new THREE.LineBasicMaterial({
			color: '#FFFF00',
			linewidth: 1,
		});

		self.start_finish_points = [];

		//	Geometry
		self.racing_line_geometry = new THREE.BufferGeometry();
		if (self.will_grow === true) {
			//	There seems to be something amiss with the update call that causes it to miss every other addition
			//	TODO: ^^ This may no longer be the case
			self.vertices_count = 0;

			self.positions = new Float32Array(self.data.length * 3); // TODO - This may not be the best way to do this
			self.racing_line_geometry.setAttribute('position', new THREE.BufferAttribute(self.positions, 3));
			self.racing_line_geometry.setDrawRange(0, 0);
		}

		//	Create the racing line
		self.racing_line = new THREE.Line(self.racing_line_geometry, self.racing_line_material);
		self.el.setObject3D('racing_line', self.racing_line);

		//	Plot racing line vertices
		// TODO - This may not be the best way to do this
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
		//	still correct in 'globe/spherical' space. This applies the calculated
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
		self.racing_line_geometry.applyMatrix4(rotation_matrix);

		if (self.will_grow === true) {
			//	Create start/finish lines
			self.start_finish_points.forEach(function (point, index) {
				const start_finish_geometry = new THREE.BufferGeometry();
				start_finish_geometry.vertices.push(point);
				start_finish_geometry.vertices.push(new THREE.Vector3((point.x + 20), (point.y + 20), point.z));
				self.el.setObject3D(('start_finish_line_' + index), new THREE.Line(start_finish_geometry, self.start_finish_material));
			});
		}
	},

	update: function (oldData) {
		const self = this;

		if (_.isEmpty(self.data.streamed_coords) === false) {
			const position = self.racing_line_geometry.getAttribute('position');

			const streamed_coords = self.data.streamed_coords.split(',').map((coords) => AFRAME.utils.coordinates.parse(coords));

			let position_index = null;
			_.forEach(streamed_coords, (coords, coords_index) => {

				position_index = (self.data.streamed_index + coords_index) * 3;

				const vertex = new THREE.Vector3(coords.x, coords.y, coords.z);
				const reorientation_quaternion = new THREE.Quaternion(
					self.data.reorientation_quaternion.x,
					self.data.reorientation_quaternion.y,
					self.data.reorientation_quaternion.z,
					self.data.reorientation_quaternion.w
				);
				vertex.applyQuaternion(reorientation_quaternion);

				position.array[(position_index + 0)] = vertex.x;
				position.array[(position_index + 1)] = vertex.y;
				position.array[(position_index + 2)] = vertex.z;
			});

			self.racing_line_geometry.setDrawRange(0, self.data.streamed_index + streamed_coords.length);
			self.racing_line_geometry.attributes.position.needsUpdate = true;
			self.racing_line_geometry.computeBoundingSphere();
			self.racing_line_geometry.computeBoundingBox();
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
			type: 'string', default: '',
		},
		streamed_index: {
			type: 'number', default: 0,
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
		self.value_material = new THREE.LineBasicMaterial({
			color: self.data.colour,
			linewidth: 1,
		});

		//	Geometry
		self.value_geometry = new THREE.BufferGeometry();

		//	There seems to be something amiss with the update call that causes it to miss every other addition
		self.point_count = 0;

		self.value_positions = new Float32Array(self.data.length * 3);
		self.value_geometry.setAttribute('position', new THREE.BufferAttribute(self.value_positions, 3));
		self.value_geometry.setDrawRange(0, 0);

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
		self.value_geometry.applyMatrix4(rotation_matrix);
	},

	update: function (oldData) {
		const self = this;

		if (_.isEmpty(self.data.streamed_coords) === false) {
			const position = self.value_geometry.getAttribute('position');
			const streamed_coords = self.data.streamed_coords.split(',').map((coords) => AFRAME.utils.coordinates.parse(coords));

			let position_index = null;
			_.forEach(streamed_coords, (coords, coords_index) => {
				position_index = (self.data.streamed_index + coords_index) * 3;

				const vertex = new THREE.Vector3(coords.x, coords.y, coords.z);
				const reorientation_quaternion = new THREE.Quaternion(
					self.data.reorientation_quaternion.x,
					self.data.reorientation_quaternion.y,
					self.data.reorientation_quaternion.z,
					self.data.reorientation_quaternion.w
				);
				vertex.applyQuaternion(reorientation_quaternion);

				position.array[(position_index + 0)] = vertex.x;
				position.array[(position_index + 1)] = vertex.y;
				position.array[(position_index + 2)] = vertex.z;
			});

			self.value_geometry.setDrawRange(0, self.data.streamed_index + streamed_coords.length);
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
			type: 'string', default: '',
		},
		streamed_deltas: {
			type: 'string', default: '',
		},
		streamed_index: {
			type: 'number', default: 0,
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
			// color: self.data.colour,
			transparent: true,
			opacity: 0.85,
			side: THREE.DoubleSide,
			depthWrite: true,
			vertexColors: true,
		});

		//	Geometry
		self.fill_geometry = new THREE.BufferGeometry();

		//	There seems to be something amiss with the update call that causes it to miss every other addition
		self.point_count = 0;
		self.vertices_per_segment = 2;
		self.indicies_per_segment = 6;

		self.fill_indicies = new Array(self.data.length);
		for (let i = 0, l = (self.data.length - 1); i < l; i++) {
			self.fill_indicies[((i * self.indicies_per_segment) + 0)] =  ((i * 2) + 0);
			self.fill_indicies[((i * self.indicies_per_segment) + 1)] =  ((i * 2) + 1);
			self.fill_indicies[((i * self.indicies_per_segment) + 2)] =  ((i * 2) + 2);
			self.fill_indicies[((i * self.indicies_per_segment) + 3)] =  ((i * 2) + 3);
			self.fill_indicies[((i * self.indicies_per_segment) + 4)] =  ((i * 2) + 2);
			self.fill_indicies[((i * self.indicies_per_segment) + 5)] =  ((i * 2) + 1);
		}
		self.fill_geometry.setIndex(self.fill_indicies);

		self.fill_positions = new Float32Array(self.data.length * self.vertices_per_segment * 3);
		self.fill_colours = new Float32Array(self.data.length * self.vertices_per_segment * 3);

		self.fill_geometry.setAttribute('position', new THREE.BufferAttribute(self.fill_positions, 3));
		self.fill_geometry.setAttribute('color', new THREE.BufferAttribute(self.fill_colours, 3));

		//	Create the filled surface
		self.filled_surface = new THREE.Mesh(self.fill_geometry, self.fill_material);
		self.el.setObject3D('filled_surface', self.filled_surface);

		//	Plot value filled surface vertices
		// self.data.coords.forEach((point, index) => {
		// 	const position = (index * 3);

		// 	self.fill_positions[(position)] = point.x;
		// 	self.fill_positions[(position + 1)] = point.y;
		// 	self.fill_positions[(position + 2)] = point.z;

		// 	self.point_count++;
		// });

		self.fill_geometry.setDrawRange(0, 0);

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
		self.fill_geometry.applyMatrix4(rotation_matrix);
	},

	update: function (oldData) {
		const self = this;

		if (_.isEmpty(self.data.streamed_coords) === false && _.isEmpty(self.data.streamed_deltas) === false) {
			const position = self.fill_geometry.getAttribute('position');
			const colour = self.fill_geometry.getAttribute('color');
			const streamed_coords = self.data.streamed_coords.split(',').map((coords) => AFRAME.utils.coordinates.parse(coords));
			const streamed_deltas = self.data.streamed_deltas.split(',').map((delta) => Number(delta));

			const boundary_topup =  0.265;
			const boundary_maxup =  0.250;
			const boundary_accel =  0.125;
			const boundary_decel = -0.050;
			const boundary_maxdn = -1.125;

			const top_colour_maxup = new THREE.Color('rgb(252, 212, 000)');
			const top_colour_midup = new THREE.Color('rgb(255, 045, 241)');
			const top_colour_accel = new THREE.Color('rgb(050, 045, 241)');
			const top_colour_coast = new THREE.Color('rgb(050, 167, 241)');
			const top_colour_decel = new THREE.Color('rgb(255, 024, 000)');
			const top_colour_maxdn = new THREE.Color('rgb(097, 000, 079)');

			const bot_colour_maxup = new THREE.Color('rgb(000, 000, 000)');
			const bot_colour_midup = new THREE.Color('rgb(000, 000, 000)');
			const bot_colour_accel = new THREE.Color('rgb(000, 000, 000)');
			const bot_colour_coast = new THREE.Color('rgb(000, 000, 000)');
			const bot_colour_decel = new THREE.Color('rgb(000, 000, 000)');
			const bot_colour_maxdn = new THREE.Color('rgb(000, 000, 000)');

			let delta_colour = null;
			let position_index = null;
			_.forEach(streamed_coords, (coords, coords_index) => {
				position_index = ((self.data.streamed_index * 2) + coords_index) * 3;

				const vertex = new THREE.Vector3(coords.x, coords.y, coords.z);
				const reorientation_quaternion = new THREE.Quaternion(
					self.data.reorientation_quaternion.x,
					self.data.reorientation_quaternion.y,
					self.data.reorientation_quaternion.z,
					self.data.reorientation_quaternion.w
				);
				vertex.applyQuaternion(reorientation_quaternion);

				position.array[(position_index + 0)] = vertex.x;
				position.array[(position_index + 1)] = vertex.y;
				position.array[(position_index + 2)] = vertex.z;

				const delta_index = Math.floor(coords_index / 2);

				let top_delta_colour = top_colour_coast;
				let bot_delta_colour = bot_colour_coast;

				//	TODO: Replace with method that takes the boundaries and list of colours on the gradient as inputs
				switch (true) {
					//	Maximum acceleration
					case streamed_deltas[delta_index] >= boundary_maxup:
						const top_colour_maxup_lerped = new THREE.Color(top_colour_midup).lerp(top_colour_maxup, ((streamed_deltas[delta_index] - boundary_maxup) * (1 / boundary_topup)));
						const bot_colour_maxup_lerped = new THREE.Color(bot_colour_midup).lerp(bot_colour_maxup, ((streamed_deltas[delta_index] - boundary_maxup) * (1 / boundary_topup)));

						top_delta_colour = top_colour_maxup_lerped;
						bot_delta_colour = bot_colour_maxup_lerped;
						break;

					//	Accelerating
					case streamed_deltas[delta_index] >= boundary_accel:
						const top_colour_accel_lerped = new THREE.Color(top_colour_accel).lerp(top_colour_midup, ((streamed_deltas[delta_index] - boundary_accel) * (1 / boundary_maxup)));
						const bot_colour_accel_lerped = new THREE.Color(bot_colour_accel).lerp(bot_colour_midup, ((streamed_deltas[delta_index] - boundary_accel) * (1 / boundary_maxup)));

						top_delta_colour = top_colour_accel_lerped;
						bot_delta_colour = bot_colour_accel_lerped;
						break;

					//	Minimum acceleration
					// case streamed_deltas[delta_index] === boundary_accel:
					// 	top_delta_colour = top_colour_accel;
					// 	bot_delta_colour = bot_colour_accel;
					// 	break;

					//	Marginal acceleration
					case streamed_deltas[delta_index] > 0.0:
						const top_colour_marup_lerped = new THREE.Color(top_colour_coast).lerp(top_colour_accel, ((streamed_deltas[delta_index]) * (1 / boundary_accel)));
						const bot_colour_marup_lerped = new THREE.Color(bot_colour_coast).lerp(bot_colour_accel, ((streamed_deltas[delta_index]) * (1 / boundary_accel)));

						top_delta_colour = top_colour_marup_lerped;
						bot_delta_colour = bot_colour_marup_lerped;
						break;

					//	Maximum deceleration
					case streamed_deltas[delta_index] < boundary_maxdn:
						top_delta_colour = top_colour_maxdn;
						bot_delta_colour = bot_colour_maxdn;
						break;

					//	Decelerating
					case streamed_deltas[delta_index] <= boundary_decel:
						const top_colour_decel_lerped = new THREE.Color(top_colour_decel).lerp(top_colour_maxdn, ((streamed_deltas[delta_index] - boundary_decel) * (1 / boundary_maxdn)));
						const bot_colour_decel_lerped = new THREE.Color(bot_colour_decel).lerp(bot_colour_maxdn, ((streamed_deltas[delta_index] - boundary_decel) * (1 / boundary_maxdn)));

						top_delta_colour = top_colour_decel_lerped;
						bot_delta_colour = bot_colour_decel_lerped;
						break;

					//	Minimum deceleration
					// case streamed_deltas[delta_index] === boundary_decel:
					// 	top_delta_colour = top_colour_decel;
					// 	bot_delta_colour = bot_colour_decel;
					// 	break;

					//	Marginal deceleration
					case streamed_deltas[delta_index] < 0.0:
						const top_colour_mardn_lerped = new THREE.Color(top_colour_coast).lerp(top_colour_decel, ((streamed_deltas[delta_index]) * (1 / boundary_decel)));
						const bot_colour_mardn_lerped = new THREE.Color(bot_colour_coast).lerp(bot_colour_decel, ((streamed_deltas[delta_index]) * (1 / boundary_decel)));

						top_delta_colour = top_colour_mardn_lerped;
						bot_delta_colour = bot_colour_mardn_lerped;
						break;
				}

				if (position_index % 2 === 1) {
					colour.array[(position_index + 0)] = top_delta_colour.r;
					colour.array[(position_index + 1)] = top_delta_colour.g;
					colour.array[(position_index + 2)] = top_delta_colour.b;
				}
				else {
					colour.array[(position_index + 0)] = bot_delta_colour.r;
					colour.array[(position_index + 1)] = bot_delta_colour.g;
					colour.array[(position_index + 2)] = bot_delta_colour.b;
				}

				self.point_count++;
			});

			self.fill_geometry.setDrawRange(0, position_index - 3);
			self.fill_geometry.attributes.position.needsUpdate = true;
			self.fill_geometry.attributes.color.needsUpdate = true;
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
		self.racing_dots_geometry.applyMatrix4(rotation_matrix);	
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
		self.smoothing_geometry.applyMatrix4(rotation_matrix);	
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
