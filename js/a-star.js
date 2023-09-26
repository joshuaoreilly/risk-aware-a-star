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

var data = matrixToArrayOfObjects(matrix);

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

const heatmapColorScale = d3.scaleSequential(d3.interpolateViridis)
    .domain([0, d3.max(matrix, row => d3.max(row))]);

// https://stackoverflow.com/questions/17343338/difference-between-functiond-and-functiond-i
heatmapSvg.selectAll("rect")
    .data(data)
    .enter().append("rect")
    .attr("x", d => d.col * cellWidth)
    .attr("y", d => d.row * cellHeight)
    .attr("width", cellWidth)
    .attr("height", cellHeight)
    .attr("fill", d => heatmapColorScale(d.value));

/*
// Set up the line chart
const lineSvg = heatmapContainer.append("svg")
    .attr("width", svgWidth)
    .attr("height", svgHeight);

const xScale = d3.scaleLinear()
    .domain([0, lineData.length - 1])
    .range([0, 500]);

const yScale = d3.scaleLinear()
    .domain([0, d3.max(lineData)])
    .range([100, 0]);

const line = d3.line()
    .x((d, i) => xScale(i))
    .y(d => yScale(d));

heatmapSvg.append("path")
    .datum(lineData)
    .attr("d", line)
    .attr("fill", "none")
    .attr("stroke", "red")
    .attr("stroke-width", 2);
    */
