export namespace WebWorker {
	export enum Task {
		GraphPointsBatch = 'GRAPH_POINTS_BATCH',
		GraphPointsFinished = 'GRAPH_POINTS_FINISHED',
		MetadataLoaded = 'METADATA_LOADED',
		PointsGraphed = 'POINTS_GRAPHED',
		PointsLoaded = 'POINTS_LOADED',
		PointsSmoothed = 'POINTS_SMOOTHER',
		SmoothPointsBatch = 'SMOOTH_POINTS_BATCH',
		SmoothPointsFinished = 'SMOOTH_POINTS_FINISHED',
		Terminate = 'TERMINATE',
	}
}
