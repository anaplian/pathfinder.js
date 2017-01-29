var launchPathfinder = (function(){
    var CANVAS_WIDTH_PX = 600, CANVAS_HEIGHT_PX = 600;
    var CELL_SIZE_PX = 30; 
    var DELAY_MS = 40;
    var BG_COLOUR = "#dee7e7", 
        CLOSED_COLOUR = "#82bee6",
        OPEN_COLOUR = "#68b3e5",
        TEXT_COLOUR = "#fff",
        PATH_COLOUR = "#192025",
        OBSTACLE_COLOUR = "#fff",
        START_COLOUR = "#a4ffba",
        FINISH_COLOUR = "#a4ffba",
        CURRENT_COLOUR = "#f8ff8e";

    var SCORE_FONT = "arial 15px";

    var TIMER = null;
    var TILE_TYPE = {
        BLANK: 0,
        OBSTACLE: 1
    };

    var OBSTACLE_PROBABILITY = 0.05,
        ADJACENT_OBSTACLE_PROBABILITY = 0.3;

    var init = function(canvas){
        // setup canvas context
        var cxt;
        canvas.width = CANVAS_WIDTH_PX;
        canvas.height = CANVAS_HEIGHT_PX;
		cxt = canvas.getContext('2d');
        cxt.fillStyle = BG_COLOUR;
        cxt.fillRect(0, 0, CANVAS_WIDTH_PX, CANVAS_HEIGHT_PX);

        // create the grid representation
        var numRows = Math.floor(CANVAS_WIDTH_PX/CELL_SIZE_PX),
            numCols = Math.floor(CANVAS_HEIGHT_PX/CELL_SIZE_PX);
        var grid = createGrid(numRows, numCols);

        // set a random starting position
        var startPosition = randomCoords(numRows, numCols);

        // set a random end position
        var finishPosition = randomCoords(numRows, numCols);

        // ensures the start and end positions are accessible
        // the pathfinder won't evaluate obstacles
        grid[finishPosition.x][finishPosition.y] = TILE_TYPE.BLANK;
        grid[startPosition.x][startPosition.y] = TILE_TYPE.BLANK;

        // initialise arrays of evaluated (closed) and unevaluated (open) nodes
        var openNodes = [];
        var closedNodes = [];

        // creates a node at the starting position and adds to open list
        var startNode = createNode(startPosition.x, startPosition.y, null, 0, 0, 0);
        openNodes.push(startNode);
        
        // start the timer
        if(TIMER) {
            window.clearInterval(TIMER);
        }

        // run the step algorithm at an interval
        TIMER = window.setInterval(function(){
            var currentNode = aStarStep(grid, openNodes, closedNodes,
             startPosition, finishPosition, cxt);
            doPainting(openNodes, closedNodes, 
             startPosition, finishPosition, currentNode, grid, cxt);
        }, DELAY_MS);

    };

    function createGrid(rowLength, colLength){
        var grid = [];
        var x, y;
        for(x = 0; x < rowLength; x++){
            grid[x] = [];
            for(y = 0; y < colLength; y++){
                grid[x][y] = TILE_TYPE.BLANK;
            }
        }

        // add random obstacles to the grid
        // first pass places random dots
        for(x = 0; x < grid.length; x++){
            for(y = 0; y < grid[0].length; y++){
                if(Math.random() < OBSTACLE_PROBABILITY && grid[x][y] == TILE_TYPE.BLANK){
                    grid[x][y] = TILE_TYPE.OBSTACLE;
                }
            }
        }

        // second pass beefs up the dots
        for(x = 0; x < grid.length; x++){
            for(y = 0; y < grid[0].length; y++){
                if(grid[x][y] != TILE_TYPE.OBSTACLE && adjacentToObstacle(x,y, grid)){
                    if(Math.random() < ADJACENT_OBSTACLE_PROBABILITY && grid[x][y] == TILE_TYPE.BLANK){
                        grid[x][y] = TILE_TYPE.OBSTACLE;
                    }
                }
            }
        }

        return grid;
    }

    function aStarStep(grid, open, closed, start, finish, cxt){
        // if there are no squares left to evaluate, stop looking
        if(open.length === 0) return;

        var currentNode = lowestCostNode(open);
        open.splice(open.indexOf(currentNode), 1);
        closed.push(currentNode);

        // don't want diagonal movement so ignore diag nodes
        var neighbours = {};
        if(ontheGrid(currentNode.x, currentNode.y-1, grid)){
            neighbours.north = createNode(currentNode.x, currentNode.y-1, currentNode);
        }
        if(ontheGrid(currentNode.x+1, currentNode.y, grid)){
            neighbours.east = createNode(currentNode.x+1, currentNode.y, currentNode);
        }
        if(ontheGrid(currentNode.x, currentNode.y+1, grid)){
            neighbours.south = createNode(currentNode.x, currentNode.y+1, currentNode);
        }
        if(ontheGrid(currentNode.x-1, currentNode.y, grid)){
            neighbours.west =  createNode(currentNode.x-1, currentNode.y, currentNode);
        }

        for(var node in neighbours){
            if(neighbours.hasOwnProperty(node)){
                if(!isInList(closed, neighbours[node]) &&
                 !isObstacle(neighbours[node].x, neighbours[node].y, grid)) {
                     
                    // calc f, g & h
                    // f is the total score
                    // g is the cost from the start node
                    // h is the heuristic
                    var f, g, h;
                    if(neighbours[node].parent){
                        g = neighbours[node].parent.g + 1;
                    }
                    h = manhattanDistance(neighbours[node], finish);
                    f = g+h;

                    if(!isInList(open, neighbours[node])){
                        neighbours[node].f = f;
                        neighbours[node].g = g;
                        neighbours[node].h = h;
                        open.push(neighbours[node]);
                    } else {
                        var existingNode = getNodeFromList(open, neighbours[node]);
                        if(existingNode.g > neighbours[node].g){
                            open.splice(open.indexOf(existingNode), 1);
                            open.push(neighbours[node]);
                        }
                    }
                }
            }
        }

        if(isInList(closed, finish)) {
            window.clearInterval(TIMER);
        }

        return currentNode;
    }

    function manhattanDistance(pointA, pointB){
        var distance = 0;
        distance += Math.abs(pointB.x - pointA.x);
        distance += Math.abs(pointB.y - pointA.y);
        return distance;
    }

    /** PAINTING METHODS */

    function doPainting(open, closed, start, finish, currentNode, grid, cxt){
        fillNodes(closed, CLOSED_COLOUR, false, cxt);
        fillNodes(open, OPEN_COLOUR, true, cxt);
        fillNode(currentNode, CURRENT_COLOUR, cxt);

        fillPath(closed, finish, PATH_COLOUR, cxt);
        fillObstacles(grid, cxt);
        fillNode([start], START_COLOUR, false, cxt);
        fillNode([finish], FINISH_COLOUR, false, cxt);
    }

    function fillNodes(nodes, colour, writeScore, cxt){
        cxt.fillStyle = colour;

        var i, thisNode;
        if(!writeScore){
            for(i = 0; i < nodes.length; i++){
                thisNode = nodes[i];
                cxt.fillRect(thisNode.x*CELL_SIZE_PX, thisNode.y*CELL_SIZE_PX, CELL_SIZE_PX, CELL_SIZE_PX);
            } 
        } else {
            for(i = 0; i < nodes.length; i++){
                cxt.fillStyle = colour;
                thisNode = nodes[i];
                cxt.fillRect(thisNode.x*CELL_SIZE_PX, thisNode.y*CELL_SIZE_PX, CELL_SIZE_PX, CELL_SIZE_PX);
                cxt.fillStyle = TEXT_COLOUR;
                cxt.font = SCORE_FONT;
                cxt.fillText(thisNode.f, thisNode.x*CELL_SIZE_PX, thisNode.y*CELL_SIZE_PX+20);
            }
        }
    }

    function fillObstacles(grid, cxt){
        cxt.fillStyle = OBSTACLE_COLOUR;
        for(var x = 0; x < grid.length; x++){
            for(var y = 0; y < grid[0].length; y++){
                if(grid[x][y] == TILE_TYPE.OBSTACLE){
                    cxt.fillRect(x*CELL_SIZE_PX, y*CELL_SIZE_PX, CELL_SIZE_PX, CELL_SIZE_PX);
                }
            }
        }
    
    }

    function fillPath(closed, finish, colour, cxt){
        cxt.fillStyle = colour;
        if(isInList(closed, finish)){
            var parent = true;
            var thisNode = getNodeFromList(closed, finish);
            while(parent){
                if(thisNode.parent !== null){
                    cxt.fillRect(thisNode.x*CELL_SIZE_PX, thisNode.y*CELL_SIZE_PX, CELL_SIZE_PX, CELL_SIZE_PX);
                    thisNode = thisNode.parent;
                } else {
                    parent = false;
                }
            }
        }
    }

    /** HELPER FUNCTIONS */
    function createNode(x, y, parent, f, g, h){
        var node = {};
        node.x = x;
        node.y = y;
        node.parent = parent || null;
        node.f = f;
        node.g = g;
        node.h = h;

        return node;
    }
  
    function isObstacle(x,y, grid){
        if(ontheGrid(x,y, grid)){
            if(grid[x][y] == TILE_TYPE.OBSTACLE){
                return true;
            }
        }
        return false;
    }

    function lowestCostNode(list){
        var lowestCostNode = null;

        if(list.length > 0){
            lowestCostNode = list[0];
            for(var i = 1; i < list.length; i++){
                if(list[i].f < lowestCostNode.f){
                    lowestCostNode = list[i];
                }
            }
        }
        return lowestCostNode;
    }

    function isInList(list, coords){
        if(coords.hasOwnProperty('x') && coords.hasOwnProperty('y')){
            for(var i = 0; i < list.length; i++){
                if(list[i].hasOwnProperty('x') && list[i].x == coords.x &&
                 list[i].hasOwnProperty('y') && list[i].y == coords.y){
                    return true;
                }
            }
        }
        return false;
    }

    function getNodeFromList(list, coords){
        if(coords.hasOwnProperty('x') && coords.hasOwnProperty('y')){
            for(var i = 0; i < list.length; i++){
                if(list[i].hasOwnProperty('x') && list[i].x == coords.x &&
                 list[i].hasOwnProperty('y') && list[i].y == coords.y){
                    return list[i];
                }
            }
        }
    }

    function adjacentToObstacle(x,y, grid){
        if(ontheGrid(x-1, y, grid)){
            if(grid[x-1][y] == TILE_TYPE.OBSTACLE) return true;
        }
        if(ontheGrid(x+1, y, grid)){
            if(grid[x+1][y] == TILE_TYPE.OBSTACLE) return true;
        }
        if(ontheGrid(x, y-1, grid)){
            if(grid[x][y-1] == TILE_TYPE.OBSTACLE) return true;
        }
        if(ontheGrid(x, y+1, grid)){
            if(grid[x][y+1] == TILE_TYPE.OBSTACLE) return true;
        }     
    }

    function ontheGrid(x,y, grid){
        if( x < 0 || x >= grid.length ||
            y < 0 || y >= grid[0].length) {
            return false;
        }
        return true;
    }

    function randomCoords(maxX, maxY){
        var point = {};
        point.x = Math.floor(Math.random() * maxX);
        point.y = Math.floor(Math.random() * maxY);
        return point;
    }

    return init;
})();