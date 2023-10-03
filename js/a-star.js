const riskMultiplierText = document.getElementById("riskMultiplierText");
const maxRangeText = document.getElementById("maxRangeText");
const planButton = document.getElementById("planButton");

var KEEP_OUT_VALUE = 2;
var HIGH_RISK_PENALTY = riskMultiplierText.value;
var MAX_RANGE = maxRangeText.value;

class MapData {
    constructor() {
        this.rows = 60;
        this.cols = 60;
        this.riskValues = this.getRiskValuesDefault();
        // https://jsfiddle.net/btjsxzo3/18/
        this.riskValuesObjects = this.matrixToArrayOfObjects();
        this.nest = {x: 50, y: 24};
        this.sites = [
            {x: 0, y: 24},
            {x: 55, y: 40},
            {x: 40, y: 30},
            {x: 13, y: 27},
            {x: 22, y: 30},
            {x: 38, y: 20},
            {x: 7, y: 35},
            {x: 29, y: 42},
            {x: 12, y: 50},
            {x: 27, y: 38}
        ]
    }

    /**
     * Create default risk map, small keep-out circle in the center,
     * then larger high-risk circle around that.
     * @returns 2D array of no-risk, high-risk, and keep-out zones
     */
    getRiskValuesDefault() {
        // Fill matrix of zeros with centered keep out zone and danger zone
        // https://stackoverflow.com/questions/3689903/how-to-create-a-2d-array-of-zeroes-in-javascript
        let riskValues = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
        for (var i = 0; i < riskValues.length; i++) {
            for (var j = 0; j < riskValues[i].length; j++) {
                if (((i - (this.rows / 2))**2 + (j - (this.cols / 2))**2) < (Math.min(this.rows, this.cols) * 6)) {
                    riskValues[i][j] = 1;
                }
                if (((i - (this.rows / 2))**2 + (j - (this.cols / 2))**2) < (Math.min(this.rows, this.cols))) {
                    riskValues[i][j] = KEEP_OUT_VALUE;
                }
            }
        }
        return riskValues;
    }

    /**
     * Convert 2D array of risk values to 2D array of objects containing
     * coordinates and risk values, for easier D3 ingestion.
     * @returns Array of objects containing x and y coordinates and risk values
     */
    matrixToArrayOfObjects() {
        var data = [];
        for (var i = 0; i < this.riskValues.length; i++) {
            for (var j = 0; j < this.riskValues[i].length; j++) {
                data.push(
                    {
                        value: this.riskValues[i][j],
                        row: i,
                        col: j
                    }
                )
            }
        }
        return data;
    }
}


class MapView {
    constructor(matrix) {
        // https://stackoverflow.com/questions/44833788/making-svg-container-100-width-and-height-of-parent-container-in-d3-v4-instead
        this.mapDiv = document.getElementById("map")

        this.svgWidth = this.mapDiv.clientWidth;
        this.svgHeight = this.svgWidth;
        this.cellWidth = this.svgWidth / matrix[0].length;
        this.cellHeight = this.cellWidth;

        this.mapContainer = d3.select(this.mapDiv);
        this.mapSvg = this.mapContainer.append("svg")
                                        .attr("width", this.svgWidth)
                                        .attr("height", this.svgHeight)
                                        .append("g");
        this.mapColorScale = d3.scaleSequential(d3.interpolateGnBu)
                                .domain([0, d3.max(matrix, row => d3.max(row))]);
    }

    /**
     * Visualize risk map
     * @param {Object} matrixObjectForm array of objects containing x-y coordinates and risk values
     */
    visualizeMap(matrixObjectForm) {
        // https://stackoverflow.com/questions/17343338/difference-between-functiond-and-functiond-i
        this.mapSvg.selectAll("rect")
                    .data(matrixObjectForm)
                    .enter().append("rect")
                    .attr("x", d => d.col * this.cellWidth)
                    .attr("y", d => d.row * this.cellHeight)
                    .attr("width", this.cellWidth)
                    .attr("height", this.cellHeight)
                    .attr("fill", d => this.mapColorScale(d.value));
    }

    /**
     * Visualize sites on risk map
     * @param {Object} sites array of destination x-y coordinates
     */
    visualizeSites(sites) {
        this.mapSvg.append('g')
                .selectAll("circle")
                .data(sites)
                .enter()
                .append("circle")
                    .attr("cx", d => d.x * this.cellWidth + this.cellWidth / 2)
                    .attr("cy", d => d.y * this.cellHeight + this.cellHeight / 2)
                    .attr("r", Math.floor(this.cellWidth / 2))
                    .attr("fill", "red")
    }

    /**
     * Visualize starting position on risk map
     * @param {Object} nest x-y coordinates of starting position (nest)
     */
    visualizeNest(nest) {
        this.mapSvg.append('g')
                    .selectAll("circle")
                    .data([nest])
                    .enter()
                    .append("circle")
                        .attr("cx", d => d.x * this.cellWidth + this.cellWidth / 2)
                        .attr("cy", d => d.y * this.cellHeight + this.cellHeight / 2)
                        .attr("r", this.cellWidth)
                        .attr("fill", "blue")
    }

    /**
     * Draw path between site and nest on map
     * @param {Object} path sequence of positions between site and nest
     * @param {Object} svg d3 object to draw path on to
     */
    drawPath(path) {
        const lineGenerator = d3.line()
            .x(d => d.x * this.cellWidth + this.cellWidth / 2)
            .y(d => d.y * this.cellHeight + this.cellHeight / 2);

        this.mapSvg.append("path")
                    .datum(path)
                    .attr("d", lineGenerator(path))
                    .attr("fill", "none")
                    .attr("stroke", "red")
                    .attr("stroke-width", 2);
    }

    /**
     * Erase existing SVG visualization
     */
    clearVisualization() {
        this.mapSvg.selectAll("*").remove();
    }
}


class PathPlanner {
    constructor() {}

    /**
     * Plan paths using risk- and max-range-aware A-Star (A*)
     * @param {Object} riskMap 2D array of no-risk, high-risk, and keep-out zones
     * @param {Object} nest x and y coordinates of nest (starting point)
     * @param {Object} sites list of x and y coordinates of sites (destinations)
     * @param {Object} mapView Visualization controller
     */
    planPaths(riskMap, nest, sites, mapView) {
        for (const site of sites) {
            var siteHash = this.getHash(site);
            // Distance from nest to current position along optimal path so far
            var cost_to_reach = new Map();
            // Distance from nest to current position along optimal path so far, including penalty for traversing high risk areas
            var cost_to_reach_penalized = new Map();
            // (Heuristic) distance from current position to delivery site, as the crow flies
            var cost_to_go = new Map();
            // Coordinates of previous point in the optimal path to the current position
            parent = new Map();
            // List of position to visit, sorted by lowest combined cost-to-go and cost-to-reach (w/ penalty)
            const to_visit = new FlatQueue();
    
            // Initialize with nest as current position
            const nestHash = this.getHash(nest);
            cost_to_reach.set(nestHash, 0.0);
            cost_to_reach_penalized.set(nestHash, 0.0);
            cost_to_go.set(nestHash, this.norm(nest, site));
            parent.set(nestHash, null);
            to_visit.push(nest, cost_to_reach_penalized.get(nestHash) + cost_to_go.get(nestHash));

            var valid_path_found = false;
            while (to_visit.length != 0) {
                var currentPosition = to_visit.pop();
                var currentPositionHash = this.getHash(currentPosition);
                // Found delivery site, generate path
                if (currentPositionHash === siteHash) {
                    valid_path_found = true;
                    mapView.drawPath(this.getPath(parent, site, siteHash));
                    break;
                }
                else {
                    var neighbors = this.getNeighbors(currentPosition, riskMap);
                    for (const neighbor of neighbors) {                    
                        var neighborHash = this.getHash(neighbor);
                        var new_cost_to_reach = cost_to_reach.get(currentPositionHash) + this.norm(currentPosition, neighbor);
                        var new_cost_to_reach_penalized = cost_to_reach_penalized.get(currentPositionHash) + this.norm(currentPosition, neighbor) + (riskMap[neighbor.y][neighbor.x] * HIGH_RISK_PENALTY);
                        var new_cost_to_go = this.norm(neighbor, site);

                        // Neighbor hasn't been visited or new cost to reach (w/ penalty) is lower,
                        // and the total path length (w/ norm cost-to-go) doesn't exceed max range
                        if ((!cost_to_reach.has(neighborHash) || new_cost_to_reach_penalized < cost_to_reach_penalized.get(neighborHash)) &&
                            (new_cost_to_reach + new_cost_to_go <= MAX_RANGE)) {
                                cost_to_reach.set(neighborHash, new_cost_to_reach);
                                cost_to_reach_penalized.set(neighborHash, new_cost_to_reach_penalized);
                                cost_to_go.set(neighborHash, new_cost_to_go);
                                parent.set(neighborHash,
                                    {  
                                        parentHash: currentPositionHash,
                                        parentPosition: currentPosition
                                    });
                                to_visit.push(neighbor, new_cost_to_reach_penalized + cost_to_go.get(neighborHash));
                        }
                    }
                }
            }
            if (! valid_path_found) {
                console.log("No valid path found for site " + siteHash + ", recalculating without high risk multiplier");
                this.planPathBackup(riskMap, nest, site, mapView);
            }
            else {
                console.log("Valid path found for site " + siteHash);
            }
        }
    }

    /**
     * Plan paths using max-range-aware (but not risk-aware) A-Star (A*)
     * Useful for when risk-aware A-Star fails due to the maximum range
     * being essentially a straight line passing through a high-risk area.
     * For example, using max-range of 51.7 works, but 52 will fail for
     * the far-left site; the backup planner works in this case though.
     * @param {Object} riskMap 2D array of no-risk, high-risk, and keep-out zones
     * @param {Object} nest x and y coordinates of nest (starting point)
     * @param {Object} site x and y coordinates of a site (destination)
     * @param {Object} mapView Visualization controller
     */
    planPathBackup(riskMap, nest, site, mapView) {
        var siteHash = this.getHash(site);
        // Distance from nest to current position along optimal path so far
        var cost_to_reach = new Map();
        // (Heuristic) distance from current position to delivery site, as the crow flies
        var cost_to_go = new Map();
        // Coordinates of previous point in the optimal path to the current position
        parent = new Map();
        // List of position to visit, sorted by lowest combined cost-to-go and cost-to-reach (w/ penalty)
        const to_visit = new FlatQueue();

        // Initialize with nest as current position
        const nestHash = this.getHash(nest);
        cost_to_reach.set(nestHash, 0.0);
        cost_to_go.set(nestHash, this.norm(nest, site));
        parent.set(nestHash, null);
        to_visit.push(nest, cost_to_reach.get(nestHash) + cost_to_go.get(nestHash));

        var valid_path_found = false;
        while (to_visit.length != 0) {
            var currentPosition = to_visit.pop();
            var currentPositionHash = this.getHash(currentPosition);
            // Found delivery site, generate path
            if (currentPositionHash === siteHash) {
                valid_path_found = true;
                mapView.drawPath(this.getPath(parent, site, siteHash));
                break;
            }
            else {
                var neighbors = this.getNeighbors(currentPosition, riskMap);
                for (const neighbor of neighbors) {                    
                    var neighborHash = this.getHash(neighbor);
                    var new_cost_to_reach = cost_to_reach.get(currentPositionHash) + this.norm(currentPosition, neighbor);
                    var new_cost_to_go = this.norm(neighbor, site);

                    // Neighbor hasn't been visited or new cost to reach is lower,
                    // and the total path length (w/ norm cost-to-go) doesn't exceed max range
                    if ((!cost_to_reach.has(neighborHash) || new_cost_to_reach < cost_to_reach.get(neighborHash)) &&
                        (new_cost_to_reach + new_cost_to_go <= MAX_RANGE)) {
                            cost_to_reach.set(neighborHash, new_cost_to_reach);
                            cost_to_go.set(neighborHash, new_cost_to_go);
                            parent.set(neighborHash,
                                {  
                                    parentHash: currentPositionHash,
                                    parentPosition: currentPosition
                                });
                            to_visit.push(neighbor, new_cost_to_reach + cost_to_go.get(neighborHash));
                    }
                }
            }
        }
        if (! valid_path_found) {
            console.log("No valid path found for site " + siteHash + " even without high risk penalty");
        }
        else {
            console.log("Valid path found for site " + siteHash + " without high risk penalty");
        }
    }

    /**
     * Hashes coordinates for insertion in maps
     * @param {Object} position object mapping x and y to Numbers
     * @returns {String} hashed coordinates
     */
    getHash(position) {
        // unique hash for given coordinates
        return ("x" + position.x.toString() + "y" + position.y.toString());
    }

    /**
     * Euclidian norm between two positions
     * @param {Object} pos1 mapping x and y to numbers
     * @param {Object} pos2 mapping x and y to numbers
     * @returns {Number} euclidian norm between positions
     */
    norm(pos1, pos2) {
        return Math.sqrt((pos1.x - pos2.x)**2 + (pos1.y - pos2.y)**2)
    }

    /**
     * List of neighboring positions which are 1. within bounds and 2. not
     * within the "Keep Out" zone
     * @param {Object} pos mapping x and y to numbers
     * @param {Object} map 2D array containing risk values
     * @returns {Object}
     */
    getNeighbors(pos, riskMap) {
        const neighbors = [
            {x: pos.x+1, y: pos.y-1}, {x: pos.x+1, y: pos.y}, {x: pos.x+1, y: pos.y+1},
            {x: pos.x, y: pos.y-1}, {x: pos.x, y: pos.y+1},
            {x: pos.x-1, y: pos.y-1}, {x: pos.x-1, y: pos.y}, {x: pos.x-1, y: pos.y+1}
        ]
        const valid_neighbors = [];
        for (const neighbor of neighbors) {
            if (neighbor.x >= 0 && neighbor.x < riskMap[0].length &&
                neighbor.y >= 0 && neighbor.y < riskMap.length &&
                riskMap[neighbor.y][neighbor.x] != KEEP_OUT_VALUE) {
                    valid_neighbors.push(neighbor);
            }
        }
        return valid_neighbors;
    }

    /**
     * Get sequence of positions from nest to site
     * @param {Object} parent hash and coordinates of parent position
     * @param {Object} site x and y of site
     * @param {String} siteHash hashed coordinates of site
     * @returns Path between site and nest
     */
    getPath(parent, site, siteHash) {
        var path = [];
        var currentPosition = site;
        var currentPositionHash = siteHash;
        while (parent.get(currentPositionHash) != null) {
            path.push(currentPosition);
            var parentObj = parent.get(currentPositionHash);
            currentPosition = parentObj.parentPosition;
            currentPositionHash = parentObj.parentHash;
        }
        // add the nest
        path.push(currentPosition);
        return path;
    }
}

/**
 * Remove existing SVG visualization, redraw map, sites, nest,
 * then plan paths and visualize them
 */
function cleanAndPlan() {
    HIGH_RISK_PENALTY = riskMultiplierText.value;
    MAX_RANGE = maxRangeText.value;
    mapView.clearVisualization();
    mapView.visualizeMap(mapData.riskValuesObjects);
    mapView.visualizeSites(mapData.sites);
    mapView.visualizeNest(mapData.nest);
    pathPlanner.planPaths(mapData.riskValues, mapData.nest, mapData.sites, mapView);
}


const mapData = new MapData();
const mapView = new MapView(mapData.riskValues);
const pathPlanner = new PathPlanner();

// visualize risk map, delivery sites, and nest
mapView.visualizeMap(mapData.riskValuesObjects);
mapView.visualizeSites(mapData.sites);
mapView.visualizeNest(mapData.nest);

// Plan initial paths
pathPlanner.planPaths(mapData.riskValues, mapData.nest, mapData.sites, mapView);

// Rebuild map and paths with new risk and range
planButton.addEventListener("click", cleanAndPlan);

