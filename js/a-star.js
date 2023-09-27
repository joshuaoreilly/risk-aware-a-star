const seedText = document.getElementById("seedText");
const seedButton = document.getElementById("seedButton");
const seedParagraph = document.getElementById("seedParagraph");

const gridDim = 60;

seedButton.addEventListener("click", updateSeed);

function updateSeed() {
    seedParagraph.textContent = "Seed is: " + seedText.value;
}

// https://jsfiddle.net/btjsxzo3/18/
var rows = 60,
    cols = 60;

// https://stackoverflow.com/questions/3689903/how-to-create-a-2d-array-of-zeroes-in-javascript
var matrix = Array(rows).fill().map(() => Array(cols).fill(0));

function fillMatrixDefault(matrix) {
    // Fill matrix of zeros with centered keep out zone and danger zone
    for (var i = 0; i < matrix.length; i++) {
        for (var j = 0; j < matrix[i].length; j++) {
            if (((i - (rows / 2))**2 + (j - (cols / 2))**2) < (Math.min(rows, cols) * 6)) {
                matrix[i][j] = 1;
            }
            if (((i - (rows / 2))**2 + (j - (cols / 2))**2) < (Math.min(rows, cols))) {
                matrix[i][j] = 2;
            }
        }
    }
    return matrix;
}

matrix = fillMatrixDefault(matrix);

var nestDefault = {x: 50, y: 24}
var sitesDefault = [
    {x: 55, y: 40},
    {x: 0, y: 24},
    {x: 40, y: 30},
    {x: 13, y: 27},
    {x: 22, y: 30},
    {x: 38, y: 20},
    {x: 7, y: 35},
    {x: 29, y: 42},
    {x: 12, y: 50},
    {x: 27, y: 38}
]

function matrixToArrayOfObjects(matrix) {
    var data = [];
    for (var i = 0; i < matrix.length; i++) {
        for (var j = 0; j < matrix[i].length; j++) {
            data.push(
                {
                    value: matrix[i][j],
                    row: i,
                    col: j
                }
            )
        }
    }
    return data;
}

var map = matrixToArrayOfObjects(matrix);
var sites = sitesDefault;
var nest = nestDefault;

// https://stackoverflow.com/questions/44833788/making-svg-container-100-width-and-height-of-parent-container-in-d3-v4-instead
var heatDiv = document.getElementById("heat")

var svgWidth = heatDiv.clientWidth;
var svgHeight = svgWidth;

var cellWidth = svgWidth / matrix[0].length,
    cellHeight = cellWidth;

// Data for the line chart (an array of values)
const lineData = [20, 40, 60, 80, 100];

// Set up the heatmap
const heatmapContainer = d3.select(heatDiv);
const heatmapSvg = heatmapContainer.append("svg")
    .attr("width", svgWidth)
    .attr("height", svgHeight)
    .append("g");

const heatmapColorScale = d3.scaleSequential(d3.interpolateGnBu)
    .domain([0, d3.max(matrix, row => d3.max(row))]);

// https://stackoverflow.com/questions/17343338/difference-between-functiond-and-functiond-i
heatmapSvg.selectAll("rect")
    .data(map)
    .enter().append("rect")
    .attr("x", d => d.col * cellWidth)
    .attr("y", d => d.row * cellHeight)
    .attr("width", cellWidth)
    .attr("height", cellHeight)
    .attr("fill", d => heatmapColorScale(d.value));

// TODO: more intelligent circle radius calculation, so that it balances not being too large, but also not shrinking too much if on a smaller screen
heatmapSvg.append('g')
    .selectAll("circle")
    .data(sites)
    .enter()
    .append("circle")
        .attr("cx", d => d.x * cellWidth + cellWidth / 2)
        .attr("cy", d => d.y * cellHeight + cellHeight / 2)
        .attr("r", Math.floor(cellWidth / 2))
        .attr("fill", "red")

heatmapSvg.append('g')
    .selectAll("circle")
    .data(nest)
    .enter()
    .append("circle")
        .attr("cx", d => d.x * cellWidth + cellWidth / 2)
        .attr("cy", d => d.y * cellHeight + cellHeight / 2)
        .attr("r", cellWidth)
        .attr("fill", "blue")

var testline = [
    {x: 20, y: 20},
    {x: 20, y: 25},
    {x: 20, y: 30}
]

const lineGenerator = d3.line()
    .x(d => d.x * cellWidth + cellWidth / 2)
    .y(d => d.y * cellHeight + cellHeight / 2);

heatmapSvg.append("path")
    .datum(testline)
    .attr("d", lineGenerator(testline))
    .attr("fill", "none")
    .attr("stroke", "red")
    .attr("stroke-width", 2);

function plan_paths(map, nest, sites) {
    for (const site of sites) {
        // Distance from nest to current position along optimal path so far
        var cost_to_reach = new Map();
        // Distance from nest to current position along optimal path so far, including penalty for traversing high risk areas
        var cost_to_reach_penalized = new Map();
        // (Heuristic) distance from current position to delivery site, as the crow flies
        var cost_to_go = new Map();
        // Coordinates of previous point in the optimal path to the current position
        parent = new Map();
        // List of position to visit, sorted by lowest combined cost-to-go and cost-to-reach (w/ penalty)
        var to_visit = "TODO"; // SHOULD BE A PRIORITY QUEUE

        // Initialize with nest as current position
        cost_to_reach.set(getHash(nest), 0.0);
        cost_to_reach_penalized.set(getHash(nest), 0.0);
        cost_to_go.set(getHash(nest), norm(nest, site));
        parent.set(getHash(nest), null);
    }
}


/**
 * Hashes coordinates for insertion in maps
 * @param {Object} position object mapping x and y to Numbers
 * @returns {String} hashed coordinates
 */
function getHash(position) {
    // unique hash for given coordinates
    return ("x" + position.x.toString() + "y" + position.y.toString());
}


/**
 * Euclidian norm between two positions
 * @param {Object} pos1 mapping x and y to numbers
 * @param {Object} pos2 mapping x and y to numbers
 * @returns {Number} euclidian norm between positions
 */
function norm(pos1, pos2) {
    return Math.sqrt((pos1.x - pos2.x)**2 + (pos1.y - pos2.y)**2)
}
