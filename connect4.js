//Point class, used to refer to a specific location on the grid
function Point(pos_x,pos_y){
	this.x = pos_x;
	this.y = pos_y;
}

var ctx;
//config object used to set the parameters of the game. This object is passed to the worker thread to initialize it
var config = new Object();
config.depth = 4;
config.grid_x = 7;
config.grid_y = 6;
config.radius = 25;
config.runTimeout = 0;
config.fourinarow = new Array();
config.threeinarow = new Array();
config.twoinarow = new Array();
config.player = 0;
config.playertype = "";
var stats;
var grid;

//create web workers that will do the processing
var player1 = new Worker("connect4-worker.js");
var player2 = new Worker("connect4-worker.js");

//when the worker sends a message, act on it.
player1.onmessage = function(event) {
	//if it's a move, then redraw the screen
	if(event.data.type == 'move'){
		onMove(event.data);
	}
	//else
		//console.log(event.data);
	//otherwise, it's an error, send it to the console so we can see it in firebug
};
//if the worker reports an error, log it in firebug
player1.onerror = function(error) {  
	//console.log(error.message);
};
//when the worker sends a message, act on it.
player2.onmessage = function(event) {
	//if it's a move, then redraw the screen
	if(event.data.type == 'move'){
		//console.log(event.data);
		onMove(event.data);
	}
	//else
		//console.log(event.data);
	//otherwise, it's an error, send it to the console so we can see it in firebug
};
//if the worker reports an error, log it in firebug
player2.onerror = function(error) {  
	//console.log(error.message);
};

function init_grid(){

	grid = new Array();
	
	//initialize the game state
	for(var i=0;i<config.grid_x;i++){
		grid[i] = new Array();
	}
	for(var i=0;i<config.grid_x;i++){	
		for(var j=0;j<config.grid_y;j++){
			grid[i][j] = 0;
		}
	}
	refresh_view();
}

function init(){
	//the canvas used to draw the state of the game
	ctx = document.getElementById('canvas').getContext("2d");
	
	stats = new Object();
	stats.moves = 0;
	
	init_grid();
	
	//come up with winning state.
	//three and two in a row are used for scoring in heuristics
	for(var row = 0; row < config.grid_x; row++){
		for(var column = 0; column < config.grid_y; column++){
			for(var delRow = -1; delRow <= 1; delRow++){
				for(var delColumn = -1; delColumn <= 1; delColumn++){
					if(((delRow == 1) && (delColumn == 0)) ||
						((delRow == 1) && (delColumn == 1)) ||
						((delRow == 0) && (delColumn == 1)) ||
						((delRow == -1) && (delColumn == 1)) && (inbounds(row,column))){
							if(inbounds( row + (3*delRow), column + (3*delColumn))){
								var anArray = [new Point(row,column),new Point(row + delRow,column + delColumn),new Point(row + (2 *delRow), column + (2 * delColumn)),new Point(row + (3 *delRow), column + (3 * delColumn))];
								config.fourinarow.push(anArray);
							}
							if(inbounds( row + (2*delRow), column + (2*delColumn))){
								var anArray = [new Point(row,column),new Point(row + delRow,column + delColumn),new Point(row + (2 *delRow), column + (2 * delColumn))];
								config.threeinarow.push(anArray);
							}
							if(inbounds( row + (delRow), column + (delColumn))){
								var anArray = [new Point(row,column),new Point(row + delRow,column + delColumn)];
								config.twoinarow.push(anArray);
							}
					}
				}
			}
		}
	}
	
	
	//tell the worker to set itself up
	var message = new Object();
	message.do = 'init';
	message.config = config;
	message.config.playertype = 'minimax';
	message.config.player = 1;
	player1.postMessage(message);
	message.config.playertype = 'random';
	message.config.player = 2;
	player2.postMessage(message);
	
	
	document.getElementById('result').innerHTML="";
}
//check if a coordiate is within the grid
function inbounds(row,column){
	return ((row >= 0) &&
               (column >= 0) &&
               (row < config.grid_x) &&
               (column < config.grid_y));

}

//This function runs repeatedly. Checks who should move, and notifies them to move.
function run(){
	//find who's move it is, send them a message to move
	if(stats.moves % 2 == 0){
		move(player1);
	}else{
		move(player2);
	}
	stats.moves++;
	clearTimeout(config.runTimeout);
}

//sends a start message to the worker. The worker will come up with the best move, or a random move, depending on how the worker was initialized.
function move(player){
	var message = new Object();
	message.do = 'move';
	message.grid = grid;
	player.postMessage(message);
}

//when a player comes back with a move, carry it out
function onMove(data){
	//console.log("moved player"+data.player+" in col "+data.column);
	for(var i = config.grid_y-1;i>=0;i--){
		if(grid[data.column][i] == 0){
			grid[data.column][i] = data.player;
			break;
		}
	}
	config.runTimeout = setTimeout(run, 300);
	refresh_view();
}

//start the run loop
function start(){
	init();
	clearTimeout(config.runTimeout);
	run();
}

//resume the run loop
function resume(){
	if(check_winner()) return true;
	clearTimeout(config.runTimeout);
	run();
}

//pause the game
function stop(){
	clearTimeout(config.runTimeout);
}
//check if there is a winner
function check_winner(){
	for(var i = 0;i < config.fourinarow.length;i++){
		if(grid[config.fourinarow[i][0].x][config.fourinarow[i][0].y] == grid[config.fourinarow[i][1].x][config.fourinarow[i][1].y] &&
		   grid[config.fourinarow[i][1].x][config.fourinarow[i][1].y] == grid[config.fourinarow[i][2].x][config.fourinarow[i][2].y] &&
		   grid[config.fourinarow[i][2].x][config.fourinarow[i][2].y] == grid[config.fourinarow[i][3].x][config.fourinarow[i][3].y] &&
		   grid[config.fourinarow[i][0].x][config.fourinarow[i][0].y] >0){
			//someone has won. Stop the game
			stop();
			
			//console.log("Player "+grid[config.fourinarow[i][0].x][config.fourinarow[i][0].y]+" has won!");
			//console.log(config.fourinarow[i][0].x+","+config.fourinarow[i][0].y);
			//console.log(config.fourinarow[i][1].x+","+config.fourinarow[i][1].y);
			//console.log(config.fourinarow[i][2].x+","+config.fourinarow[i][2].y);
			//console.log(config.fourinarow[i][3].x+","+config.fourinarow[i][3].y);
			document.getElementById('result').innerHTML="Player "+grid[config.fourinarow[i][0].x][config.fourinarow[i][0].y]+" has won!";
			return true;
		}
	}
}

//Redraw the screen based on the state of the game
function refresh_view(){
	//draw the board, color tokens as appropriate
	ctx.fillStyle = "#999";
	ctx.beginPath();
	ctx.rect(0, 0, (config.radius*2+5)*config.grid_x+5, (config.radius*2+5)*config.grid_y+5);
	ctx.closePath();
	ctx.fill();
	for(var i=0;i<config.grid_x;i++){
		for(var j=0;j<config.grid_y;j++){
			switch(grid[i][j]){
			case 0:
				//empty
				ctx.fillStyle = "#fff";
				ctx.beginPath();
				ctx.arc((config.radius + 5)+i*(config.radius*2+5),(config.radius + 5)+j*(config.radius*2+5),config.radius,0,Math.PI*2, true);
				ctx.closePath();
				ctx.fill();
				ctx.fillStyle = "#000";
				ctx.stroke();
				break;
			case 1:
				//player 1
				ctx.fillStyle = "#FFFF00";
				ctx.beginPath();
				ctx.arc((config.radius + 5)+i*(config.radius*2+5),(config.radius + 5)+j*(config.radius*2+5),config.radius,0,Math.PI*2, true);
				ctx.closePath();
				ctx.fill();
				ctx.fillStyle = "#000";
				ctx.stroke();
				break;
				break;
			case 2:
				//player2
				ctx.fillStyle = "#FF0000";
				ctx.beginPath();
				ctx.arc((config.radius + 5)+i*(config.radius*2+5),(config.radius + 5)+j*(config.radius*2+5),config.radius,0,Math.PI*2, true);
				ctx.closePath();
				ctx.fill();
				ctx.fillStyle = "#000";
				ctx.stroke();
				break;
			}
		}
	}
	check_winner();
}