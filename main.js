var launchPathfinder = (function(){
    var CANVAS_WIDTH = 600, CANVAS_HEIGHT = 600; // in px
    var CELL_SIZE = 30; // in px
    var DELAY = 40; // in ms
    var BG_COLOUR = "#dee7e7", CLOSED_COLOUR = "#82bee6", OPEN_COLOUR = "#68b3e5",
        TEXT_COLOUR = "#fff", PATH_COLOUR = "#192025", OBSTACLE_COLOUR = "#fff",
        START_COLOUR = "#a4ffba", FINISH_COLOUR = "#a4ffba"; CURRENT_COLOUR = "#f8ff8e";

    var TIMER = null;
    var TILE_TYPE = {
        BLANK: 0,
        OBSTACLE: 1
    };

    var init = function(canvas){

        var cxt = setupCanvas(canvas);
        var rowLength = Math.floor(CANVAS_WIDTH/CELL_SIZE),
            colLength = Math.floor(CANVAS_HEIGHT/CELL_SIZE);
        var grid = createGrid(rowLength, colLength);
        
        var startPosition = randomCoords(rowLength, colLength);
        grid[startPosition.x][startPosition.y] = TILE_TYPE.BLANK;
        
        var finishPosition = randomCoords(colLength, colLength);
        grid[finishPosition.x][finishPosition.y] = TILE_TYPE.BLANK;

        var openNodes = [];
        var closedNodes = [];

        var startNode = createNode(startPosition.x, startPosition.y, null, 0, 0, 0);
        openNodes.push(startNode);
        
        if(TIMER) {
            window.clearInterval(TIMER);
        }

        TIMER = window.setInterval(function(){
            var currentNode = aStarStep(grid, openNodes, closedNodes, startPosition, finishPosition, cxt);
            doPainting(openNodes, closedNodes, startPosition, finishPosition, currentNode, grid, cxt);
        }, DELAY);

    }

    function setupCanvas(canvas){
        var cxt;

        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
		cxt = canvas.getContext('2d');
        cxt.fillStyle = BG_COLOUR;
        cxt.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        return cxt
    }

    function createGrid(rowLength, colLength){
        var grid = [];
        for(var x = 0; x < rowLength; x++){
            grid[x] = [];
            for(var y = 0; y < colLength; y++){
                grid[x][y] = TILE_TYPE.BLANK;
            }
        }
        grid = addRandomObstacles(grid);

        return grid;
    }

    function aStarStep(grid, open, closed, start, finish, cxt){
        if(open.length == 0) return;

        var currentNode = lowestCostNode(open);
        //console.log(currentNode.g+"+"+currentNode.h+"="+currentNode.f);
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
                if(!isInList(closed, neighbours[node]) 
                && !isObstacle(neighbours[node].x, neighbours[node].y, grid)){
                        
                    //calc f,g,h
                    var f, g, h;
                    if(neighbours[node].parent){
                        g = neighbours[node].parent.g + 1;
                    }
                    h = manhattanDistance(neighbours[node], finish)
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
        if(pointA.hasOwnProperty('x') && pointB.hasOwnProperty('x')
        && pointA.hasOwnProperty('y') && pointB.hasOwnProperty('y')){
            var distance = 0;

            distance += Math.abs(pointB.x - pointA.x);
            distance += Math.abs(pointB.y - pointA.y);
            
            return distance;
        }
    }

    /** PAINTING METHODS */

    function doPainting(open, closed, start, finish, currentNode, grid, cxt){
        fillNodes(closed, CLOSED_COLOUR, false, cxt);
        fillNodes(open, OPEN_COLOUR, true, cxt);
        fillNode(currentNode, CURRENT_COLOUR, cxt);
    
        fillPath(closed, finish, PATH_COLOUR, cxt);
        fillObstacles(grid, cxt);
        fillNode(start, START_COLOUR, cxt);
        fillNode(finish, FINISH_COLOUR, cxt);
    }

    function fillNodes(nodes, colour, writeScore, cxt){
        cxt.fillStyle = colour;
        if(!writeScore){
            for(var i = 0; i < nodes.length; i++){
                var thisNode = nodes[i];
                cxt.fillRect(thisNode.x*CELL_SIZE, thisNode.y*CELL_SIZE, CELL_SIZE, CELL_SIZE);
            } 
        } else {
            for(var i = 0; i < nodes.length; i++){
                cxt.fillStyle = colour;
                var thisNode = nodes[i];
                cxt.fillRect(thisNode.x*CELL_SIZE, thisNode.y*CELL_SIZE, CELL_SIZE, CELL_SIZE);
                cxt.fillStyle = TEXT_COLOUR;
                cxt.font = "arial 15px";
                cxt.fillText(thisNode.f, thisNode.x*CELL_SIZE, thisNode.y*CELL_SIZE+20);
            }
        }
    }

    function fillNode(node, colour, cxt){
        if(node.hasOwnProperty('x') && node.hasOwnProperty('y')){
            cxt.fillStyle = colour;
            cxt.fillRect(node.x*CELL_SIZE, node.y*CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
    }

    function fillObstacles(grid, cxt){
        cxt.fillStyle = OBSTACLE_COLOUR;
        for(var x = 0; x < grid.length; x++){
            for(var y = 0; y < grid[0].length; y++){
                if(grid[x][y] == TILE_TYPE.OBSTACLE){
                    cxt.fillRect(x*CELL_SIZE, y*CELL_SIZE, CELL_SIZE, CELL_SIZE);
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
                if(thisNode.parent != null){
                    cxt.fillRect(thisNode.x*CELL_SIZE, thisNode.y*CELL_SIZE, CELL_SIZE, CELL_SIZE);
                    thisNode = thisNode.parent;
                } else {
                    parent = false;
                }
            }
        }
    }

    /** HELPER FUNCTIONS */
    
    function addRandomObstacles(grid){
        var obstacleProbability = 0.05;
        var adjacentObstacleProbability = 0.3;

        //first pass puts random dots on the grid
        for(var x = 0; x < grid.length; x++){
            for(var y = 0; y < grid[0].length; y++){
                if(Math.random() < obstacleProbability && grid[x][y] == TILE_TYPE.BLANK){
                    grid[x][y] = TILE_TYPE.OBSTACLE;
                }
            }
        }

        //second pass beefs up the dots
        for(var x = 0; x < grid.length; x++){
            for(var y = 0; y < grid[0].length; y++){
                if(grid[x][y] != TILE_TYPE.OBSTACLE && adjacentToObstacle(x,y, grid)){
                    if(Math.random() < adjacentObstacleProbability && grid[x][y] == TILE_TYPE.BLANK){
                        grid[x][y] = TILE_TYPE.OBSTACLE;
                    }
                }
            }
        }

        return grid;

    }

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
                if(list[i].hasOwnProperty('x') && list[i].x == coords.x
                && list[i].hasOwnProperty('y') && list[i].y == coords.y){
                    return true;
                }
            }
        }
        return false;
    }
        
    function getNodeFromList(list, coords){
        if(coords.hasOwnProperty('x') && coords.hasOwnProperty('y')){
            for(var i = 0; i < list.length; i++){
                if(list[i].hasOwnProperty('x') && list[i].x == coords.x
                && list[i].hasOwnProperty('y') && list[i].y == coords.y){
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
})()