//	Libraries
import * as _ from 'lodash';
import * as THREE from 'three';

//	Respond to message from parent thread
self.addEventListener('message', (event) => {
	const command = _.get(event, 'data.command', '');
	switch (command) {
		case 'start':
			self.smooth(_.get(event, 'data.data', []), _.get(event, 'data.bounds', []), _.get(event, 'data.weights', []));
			break;
	}
});

self.smooth = function(data, bounds, weights, points = false) {
	self.console.log('parser.smooth');

	// const smoothed_points_by_bounds = [];
	// if (points === true) {
	// 	bounds.forEach(function () {
	// 		smoothed_points_by_bounds.push([]);
	// 	});
	// 	smoothed_points_by_bounds.push([]);
	// }

	//	Iterate on each point in the racing line
	// data.forEach(function (point, index) {
	// const smooth_by_averages = function (data, point, index, length, listener, event_name) {
	const smooth_by_averages = function (data, point, index, length) {
		const averaged_points = [];

		//	Find the point that is the average position of the points
		//	within the bounding limit around the point in question
		bounds.forEach(function (max_bound, bound_i) {

			//	TODO: Bounds should stretch at low rates of speed
			//	There's an implicit assumption about the distance
			//	between GPS points and the bounding counts that is
			//	not well understood at the moment.
			const bound = Math.min(max_bound, index, (data.length - index));
			const average_point = {'x': 0, 'y': 0, 'z': 0};

			if (bound > 0) {
				const points_to_average = data.slice((index - bound), (index + bound));

				points_to_average.forEach(function (point_to_average) {
					average_point.x += _.get(point_to_average, 'coordinates.cartesian.raw.x');
					average_point.y += _.get(point_to_average, 'coordinates.cartesian.raw.y');
					average_point.z += _.get(point_to_average, 'coordinates.cartesian.raw.z');
				});

				average_point.x = (average_point.x / points_to_average.length);
				average_point.y = (average_point.y / points_to_average.length);
				average_point.z = (average_point.z / points_to_average.length);
			} else {
				average_point.x = _.get(point, 'coordinates.cartesian.raw.x');
				average_point.y = _.get(point, 'coordinates.cartesian.raw.y');
				average_point.z = _.get(point, 'coordinates.cartesian.raw.z');
			}
			averaged_points.push(average_point);
			if (points === true) {
				smoothed_points_by_bounds[bound_i].push(average_point);
			}
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
		for (var i = 1, l = averaged_points.length; i < l; i++) {
			vectors_to_averaged_points.push(averaged_points[i].clone().sub(most_averaged_point));

			const vector_between_averaged_points = averaged_points[i].clone().sub(averaged_points[(i - 1)]);
			distances_between_averaged_points.push(vector_between_averaged_points.length());
			vectors_between_averaged_points.push(vector_between_averaged_points.clone().normalize());
		}

		//	Work out the distance from the averaged point with the
		//	smallest bounds to the implied 'smoothed' point, then add
		//	all of the distances together
		var distance_rate_of_change_to_average = 0.0;
		for (var i = 1, l = distances_between_averaged_points.length; i < l; i++) {
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

		const smoothed_point = {
			'x': final_vector.x,
			'y': final_vector.y,
			'z': final_vector.z
		};

		//	Broadcast the new point
		// if (_.isNull(listener) === false && _.isNull(event_name) === false) {
		// 	listener.dispatchEvent(new CustomEvent('smoothed', {
		// 		'detail': {
		// 			'point': smoothed_point, 'index': index, 'length': length }
		// 		}
		// 	));
		// }

		self.postMessage({ 'point': smoothed_point, 'index': index, 'length': length });

		//	Store point for returning as a separate data set
		// if (points === true) {
		// 	_.last(smoothed_points_by_bounds).push(smoothed_point)
		// }

		//	Update the input data set
		// _.set(data, '[' + index + '].coordinates.cartesian.smoothed', smoothed_point);
		return smoothed_point;
	}
	// });

	// if (points === true) {
	// 	return smoothed_points_by_bounds;
	// }

	var smoothed_points = [];
	const temp_data = JSON.stringify(data);
	var cloned_data = JSON.parse(temp_data);
	var cloned_data_for_points = JSON.parse(temp_data);
	// const loop = setInterval(() => {
		// smoothed_points.push(smooth_by_averages(cloned_data, cloned_data_for_points.shift(), index_test, length, listener, event_name));
	for (var index_test = 0, length = data.length; index_test < length;) {
		smoothed_points.push(smooth_by_averages(cloned_data, cloned_data_for_points.shift(), index_test, length));
		index_test++;
	}

	self.close();
		// if (index_test >= length) {
		// 	clearInterval(loop);
		// }
	// }, interval);
}