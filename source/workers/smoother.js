//	Libraries
import * as _ from 'lodash';
import * as THREE from 'three';

self.addEventListener('message', (event) => {
	const message = JSON.parse(_.get(event, 'data', {}));
	const command = _.get(message, 'command', '');

	switch (command) {
		case 'start':
			self.smooth(
				_.get(message, 'data', []),
				_.get(message, 'bounds', []),
				_.get(message, 'weights', []),
				_.get(message, 'steps', 1),
			);
			break;
	}
});

self.smooth = function(data, bounds, weights, steps) {
	self.console.log('smoother.smooth');

	//	Iterate on each point in the racing line
	const smooth_by_averages = function (data, bounds, index, length, steps) {
		const points = [];

		for (let count = 0; count < steps && _.isUndefined(data[(index + count)]) === false; count++) {
			const averaged_points = [];

			//	Find the point that is the average position of the points
			//	within the bounding limit around the point in question
			bounds.forEach(function (max_bound, bound_i) {

				//	TODO: Bounds should stretch at low rates of speed
				//	There's an implicit assumption about the distance
				//	between GPS points and the bounding counts that is
				//	not well understood at the moment.
				const bound = Math.min(max_bound, (index + count), (data.length - (index + count)));
				const average_point = { 'x': 0, 'y': 0, 'z': 0 };

				if (bound > 0) {
					const points_to_average = data.slice(((index + count) - bound), ((index + count) + bound));

					points_to_average.forEach(function (point_to_average) {
						average_point.x += _.get(point_to_average, 'coordinates.cartesian.raw.x');
						average_point.y += _.get(point_to_average, 'coordinates.cartesian.raw.y');
						average_point.z += _.get(point_to_average, 'coordinates.cartesian.raw.z');
					});

					average_point.x = (average_point.x / points_to_average.length);
					average_point.y = (average_point.y / points_to_average.length);
					average_point.z = (average_point.z / points_to_average.length);
				} else {
					average_point.x = _.get(data, '[' + count + '].coordinates.cartesian.raw.x');
					average_point.y = _.get(data, '[' + count + '].coordinates.cartesian.raw.y');
					average_point.z = _.get(data, '[' + count + '].coordinates.cartesian.raw.z');
				}
				averaged_points.push(average_point);
			});

			//	Convert to Vector3 to use some of the built-in methods
			averaged_points.forEach(function (averaged_point, averaged_point_i) {
				averaged_points[averaged_point_i] = new THREE.Vector3(averaged_point.x, averaged_point.y, averaged_point.z);
			});

			//	Parse both the unit vectors and distances leading from the
			//	average point with the largest bounds, to the smallest
			const most_averaged_point = averaged_points[0].clone();
			const vectors_to_averaged_points = [];
			const vectors_between_averaged_points = [];
			const distances_between_averaged_points = [];
			for (let i = 1, l = averaged_points.length; i < l; i++) {
				vectors_to_averaged_points.push(averaged_points[i].clone().sub(most_averaged_point));

				const vector_between_averaged_points = averaged_points[i].clone().sub(averaged_points[(i - 1)]);
				distances_between_averaged_points.push(vector_between_averaged_points.length());
				vectors_between_averaged_points.push(vector_between_averaged_points.clone().normalize());
			}

			//	Work out the distance from the averaged point with the
			//	smallest bounds to the implied 'smoothed' point, then add
			//	all of the distances together
			let distance_rate_of_change_to_average = 0.0;
			for (let i = 1, l = distances_between_averaged_points.length; i < l; i++) {
				if (distances_between_averaged_points[(i - 1)] > distances_between_averaged_points[i]) {
					distance_rate_of_change_to_average += ((distances_between_averaged_points[i] / distances_between_averaged_points[(i - 1)]) * weights[(i - 1)]);
				} else {
					distance_rate_of_change_to_average += (1 * weights[(i - 1)]);
				}
			}
			const distance_to_smoothed_point = (distance_rate_of_change_to_average * _.last(distances_between_averaged_points));

			//	Work out the final vector to the implied 'smoothed' point
			const final_vector = _.last(vectors_between_averaged_points).clone().normalize();

			const rotation_axis_vector = new THREE.Vector3(0.0, 0.0, 0.0)
				.crossVectors(
					_.nth(vectors_between_averaged_points, -2),
					_.last(vectors_between_averaged_points)
				);

			//	Use the preceding angle between the smoothed points to
			//	predict the final angle
			//	TODO: This is wrapping around in some places, needs work
			// var angle_budget = (Math.PI / 2);
			// const angle = _.nth(vectors_between_averaged_points, -2).angleTo(_.last(vectors_between_averaged_points));
			// if (_.isNaN(angle) === false) {
			// 	angle_budget = Math.max((angle_budget - angle), 0);
			// 	final_vector.applyAxisAngle(rotation_axis_vector, angle_budget).normalize();
			// }

			//	Add the scaled vector to the most averaged point (largest
			//	boundary) and the least averaged point to calculate where
			//	the new implied 'smoothed' point is located in absolute
			//	terms.
			final_vector
				.multiplyScalar(distance_to_smoothed_point)
				.add(_.last(vectors_to_averaged_points))
				.add(most_averaged_point);

			//	Update the input data set
			points.push({ 'x': final_vector.x, 'y': final_vector.y, 'z': final_vector.z });
		}

		return points;
	}

	let cloned_data = JSON.stringify(data);
	cloned_data = JSON.parse(cloned_data);

	for (let index = 0, length = data.length; index < length; index += steps) {
		self.postMessage(JSON.stringify({
			'command': 'point',
			'points': smooth_by_averages(
				cloned_data,
				bounds,
				index,
				length,
				steps
			),
			'index': index,
			'length': length
		}));
	}

	self.postMessage(JSON.stringify({ 'command': 'terminate' }));
}