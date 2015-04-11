var CONFIG = {
	CANVAS_WIDTH: 800,
	CANVAS_HEIGHT: 500,

	INIT_SCENESPEED: 4,
	INC_INTERVAL: 20,

	PENGUIN_OFFSET: 10,

	MAX_SPEED: 9,

	ACTION_MAP: {
		LAND_UP: KEY_CODES.UP,
		LAND_DOWN: KEY_CODES.DOWN,

		GAME_START: KEY_CODES.SPACE
	}
};

function clearCanvas(context)
{
	context.clearRect(0, 0, CONFIG.CANVAS_WIDTH * 2, CONFIG.CANVAS_HEIGHT);
}

function Penguin(imageObj, context) 
{
	this.imageObj = imageObj;
	this.context = context;
	this.width = 75;
	this.height = 100;
	this.invSpeed = 7; // Penguin walks faster by decreasing this
	this.counter = 0;

	this.paintFrame = function ( posY )
	{
		if ( this.counter >= this.invSpeed * 9 ) 
			this.counter = 0;

		context.drawImage(imageObj, parseInt( this.counter++ / (10 - ( 9 / this.invSpeed)) ) * this.width, 0, this.width, this.height, CONFIG.PENGUIN_OFFSET,  posY, this.width, this.height);
	};
}

function Sprite(canvasContext, imageObj)
{
	this.context = canvasContext;
	this.imageObj = imageObj;
	this.objects = {};
	var me = this;

	this.spriteWidth = 64;
	this.spriteHeight = 100;

	this.addObject = function( objName, spriteX, spriteY, width, height )
	{
		objProps = me.objects[objName] = {};
		objProps.spriteX = spriteX;
		objProps.spriteY = spriteY;
		objProps.width = width;
		objProps.height = height; 
	};

	this.addObjects = function( objects )
	{
		for( var key in objects )
		{
			this.addObject.apply(me, [key].concat(objects[key]));
		}
	};

	this.pushObject = function ( objName, x, y )
	{
		objProps = this.objects[objName];
		this.context.drawImage(this.imageObj, objProps.spriteX, objProps.spriteY, objProps.width, objProps.height, x, y, objProps.width, objProps.height);
	};

	this.pushPartialObject = function ( objName, x, y, partialFactor )
	{
		objProps = this.objects[objName];
		this.context.drawImage(this.imageObj, objProps.spriteX, objProps.spriteY, Math.round(objProps.width * partialFactor), objProps.height, x, y, Math.round(objProps.width * partialFactor), objProps.height);
	};

	this.pushSeriesObject = function ( objName, x, y, count)
	{
		objProps = this.objects[objName];
		for ( var i = 0; i < Math.round(count); i++ ){
			this.pushObject(objName, Math.round(x + objProps.width * i), y);
		}

		if( (count - i) !== 0 )
			this.pushPartialObject(objName,  Math.round(x + objProps.width * i), y, Math.abs(count - i));
	};

	this.paintBackground = function( posX )
	{
		this.paintBackgroundRect(posX || 0, 0, CONFIG.CANVAS_WIDTH * 2, CONFIG.CANVAS_HEIGHT);
	};

	this.paintBackgroundRect = function(posX, posY, width, height)
	{
		objProps = this.objects.background;
		this.context.drawImage(this.imageObj, objProps.spriteX, objProps.spriteY, objProps.width, objProps.height, posX, posY, width, height);
	};
}

function Scene(sceneGenContext, spriteObj, otherObj)
{
	this.landPoints = [];
	this.curX = 0;
	this.sceneInitialized = 0;
	this.spriteObj = spriteObj;
	this.sceneSpeed = CONFIG.INIT_SCENESPEED;
	this.sceneGenContext = sceneGenContext;

	this.spriteHeight = spriteObj.objects["sground"].height;
	this.spriteWidth = spriteObj.objects["sground"].width;
	
	this.cloudObj = otherObj[0];	
	this.sfxSounds = otherObj[1];

	this.paintClouds = function( posX )
	{
		posX = posX || 0;
		sceneGenContext.drawImage(this.cloudObj, 0, 0, this.cloudObj.width, this.cloudObj.height, posX, 0, this.cloudObj.width, this.cloudObj.height);
	};

	this.initScene = function()
	{
		spriteObj.paintBackground();
		this.paintClouds();
		this.drawLands();
		this.drawLands(CONFIG.CANVAS_WIDTH);
			
		this.sceneInitialized = 1;
	};

	this.drawLands = function( basePos )
	{
		basePos = basePos || 0;

		var randomHeight = function() {
			return Math.floor( Math.random() * 10 % 3 ) + 1;
		};

		for ( i = 0; i < 3; i++ )
			this.drawLand(randomHeight(), 2, basePos +  i * 2 * this.spriteWidth);

		this.drawLand(randomHeight(), (CONFIG.CANVAS_WIDTH - 6 * this.spriteWidth ) / this.spriteWidth, basePos  + ( 6 * this.spriteWidth ) );		
	};

	this.requestScene = function() 
	{
		if( this.sceneInitialized === 0 )
			this.initScene();

		if( CONFIG.CANVAS_WIDTH - this.curX <= 0)
			this.generateScene();

		this.updateLandPoints();
		this.curX += this.sceneSpeed;
	};

	this.updateHeightLand = function( inc ) //inc = 1, increment land height, inc = 0, decrement it.
	{

		var oldHeight = this.landPoints[0].landHeight, 
			oldOrigHeight = this.landPoints[0].origHeight,
			i = 0;

		this.sfxSounds.Whoosh.currentTime = 0;
		this.sfxSounds.Whoosh.play();

		while( typeof this.landPoints[i] !== "undefined" && oldOrigHeight == this.landPoints[i].origHeight )
		{
			if( inc && this.landPoints[i].landHeight < 4 )
				++this.landPoints[i].landHeight;

			if( !inc && this.landPoints[i].landHeight > 1 )
				--this.landPoints[i].landHeight;

			this.clearLand(this.landPoints[i].posX, oldHeight, this.landPoints[i].landLength);
			this.drawLand(this.landPoints[i].landHeight, this.landPoints[i].landLength, this.landPoints[i].posX, true, "ground");
			
			i++;
		}
	};

	this.clearLand = function ( posX, landHeight, landLength )
	{
		this.spriteObj.paintBackgroundRect(posX, CONFIG.CANVAS_HEIGHT - this.spriteHeight * landHeight, Math.round(this.spriteWidth * landLength), this.spriteHeight * landHeight);
	};

	this.drawLand = function(landHeight, landLength, posX, noPush, landType)
	{
		landType = landType || "stone";

		if( noPush !== true )
		{
			this.landPoints.push({
				posX: posX,
				landLength: landLength,
				landHeight: landHeight,
				origHeight: landHeight,
				width: this.spriteWidth * landLength,
				height: this.spriteHeight * landHeight,
			});
		}

		for( var i = 1; i < landHeight; i++ )
			spriteObj.pushSeriesObject("s" + landType, posX, CONFIG.CANVAS_HEIGHT -  this.spriteHeight * i, landLength);
		
		spriteObj.pushSeriesObject("g" + landType, posX, CONFIG.CANVAS_HEIGHT - this.spriteHeight * i, landLength);
	};

	this.updateLandPoints = function() 
	{
		//Has the land gone out of focus?
		if( (this.landPoints[0].posX + this.landPoints[0].width - this.curX) < 30 )
		{
			// If lands' height are not equal, return, Game object will take care 
			// of triggering Game Over
			if( this.landPoints[0].landHeight !== this.landPoints[1].landHeight )
				return;
			
			this.landPoints.shift();

		var oldOrigHeight = this.landPoints[0].origHeight,
			i = 0;

			// Only increase land sizes by comparing them to their original height, so that 
			// lands only on the same level, rise or fall.
			while( typeof this.landPoints[i] !== "undefined" && oldOrigHeight == this.landPoints[i].origHeight )
			{
				this.drawLand(this.landPoints[i].landHeight, this.landPoints[i].landLength, this.landPoints[i].posX, true, "ground");
				i++;
			}
		}
	};

	// This function is called when scene approaches half the width
	// of view-port. It generates a new scene with first half corresponding
	// to second and second half is regenerated.
	this.generateScene = function() 
	{
		sceneGenContext.drawImage(sceneGenContext.canvas, CONFIG.CANVAS_WIDTH, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT, 0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
		spriteObj.paintBackground( CONFIG.CANVAS_WIDTH );

		// Assign new positions to spliced lands
		var i = 0;
		while( typeof this.landPoints[i] !== "undefined" )
		{
			this.landPoints[i].posX -= CONFIG.CANVAS_WIDTH;
			i++;
		}

		this.paintClouds(CONFIG.CANVAS_WIDTH);
		this.drawLands(CONFIG.CANVAS_WIDTH);
		this.curX -= CONFIG.CANVAS_WIDTH;
	};
}

function Game(realContext, gameObjects)
{
	var scene = gameObjects[0],
		penguin = gameObjects[1],
		sfxSounds = gameObjects[2];

	var me = this;

	var setSpeedIterator = function(){
		me.intervalId = setInterval(function(){
			scene.sceneSpeed++;
		}, CONFIG.INC_INTERVAL * 1000);
	};

	this.lastLandHeight = 0;
	this.score = 0;
	this.gameBegun = false;
	this.gameOver = false;
	this.intervalId = null;

	this.incrementScore = function()
	{
		sfxSounds.Blop.play();
		
		this.score += scene.sceneSpeed - CONFIG.INIT_SCENESPEED + 1;
		document.getElementById("score").innerHTML = this.score;
	};

	this.beginGame = function()
	{
		clearInterval(me.intervalId);
		setSpeedIterator();

		scene.sceneSpeed = CONFIG.INIT_SCENESPEED;

		scene.requestScene();
		this.gameBegun = true;
		this.gameOver = false;

		var el = document.getElementById("play_text");
		el.style.display = "none";
	};

	this.triggerGameOver = function()
	{
		var el = document.getElementById("play_text");
		el.style.display = "block";
		el.innerHTML = "<p>You score was " + this.score + ".</p> <p>Press SPACEBAR to restart</p>";

		this.gameOver = true;
		this.score = -1;
		this.gameBegun = false;

		this.incrementScore();

		scene.sceneInitialized = 0;
		scene.landPoints = [];
		scene.curX = 0;
		scene.sceneSpeed = CONFIG.INIT_SCENESPEED;
		scene.requestScene();
	};

	this.checkGameOver = function()
	{
		if( this.gameOver )
			return;

		if(scene.landPoints[0].landHeight < scene.landPoints[1].landHeight ){
			if(scene.landPoints[0].posX + scene.landPoints[0].width - scene.curX < 40 )
				this.triggerGameOver();
		}

		if(scene.landPoints[0].landHeight > scene.landPoints[1].landHeight ){
			if(scene.landPoints[0].posX + scene.landPoints[0].width - scene.curX < 30 )
				this.triggerGameOver();
		}
	};

	this.showScene = function()
	{
		if( this.gameBegun && !this.gameOver)
		{
			scene.requestScene();
			// only increment score if player actually did something
			// and not just walked on already leveled lands
			if( this.lastLandHeight != scene.landPoints[0].origHeight )
			{
				this.lastLandHeight = scene.landPoints[0].origHeight;
				this.incrementScore();
			}
		}
		
		realContext.drawImage(scene.sceneGenContext.canvas, scene.curX, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT, 0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
		penguin.paintFrame(CONFIG.CANVAS_HEIGHT - scene.landPoints[0].landHeight * scene.spriteHeight - scene.spriteHeight);

		requestAnimationFrame(function(){
			this.checkGameOver();
			this.showScene();
		}.bind(this));
	};

	this.keyHit = function( keyCode ) 
	{
		switch(keyCode)
		{
			case CONFIG.ACTION_MAP.LAND_UP:
				if( this.gameBegun ) scene.updateHeightLand(1);break;

			case CONFIG.ACTION_MAP.LAND_DOWN:
				if( this.gameBegun ) scene.updateHeightLand(0);break;

			case CONFIG.ACTION_MAP.GAME_START:
				this.beginGame();break;
		}
	};
}

function loadResources(imgPaths, sfxPaths, whenLoaded)
{
	var imgs = {}, sfxs = {}, imgCounter = 0, sfxCounter = 0;
	var imgLoaded = false, sfxLoaded = false;

  	imgPaths.forEach(function(path){
		var img = document.createElement('img');
		img.src = path;

		var fileName = path.split(/[\./]/).slice(-2, -1)[0];
		img.onload = function(){
			imgs[fileName] = img;
			imgCounter++;


			if (imgPaths.length == imgCounter)
			{
				imgLoaded = true;

				if( imgLoaded && sfxLoaded )
					whenLoaded([imgs, sfxs]);
			}
		};
	});

	sfxPaths.forEach(function(path){
		var sfx = document.createElement('audio');
		sfx.src = path;

		var fileName = path.split(/[\./]/).slice(-2, -1)[0];
		sfx.addEventListener('loadeddata', function(){
			sfxs[fileName] = sfx;
			sfxCounter++;

			if (sfxPaths.length == sfxCounter)
			{
				sfxLoaded = true;

				if( imgLoaded && sfxLoaded )
					whenLoaded([imgs, sfxs]);
			}
		});
	});
}

loadResources(["img/LandTiles.png", "img/Cloud.png", "img/Penguin.png"], ["sfx/Blop.mp3", "sfx/Whoosh.mp3"], init);

// Our Game follows an architecture of viewport and window
// where window is twice the width of game and viewport is
// selected portion of the game which moves over the window.
function init( resArr )
{
	var imgObj = resArr[0],
		sfxSounds = resArr[1];

	var viewport = document.getElementById("viewport"),
		vp_context = viewport.getContext("2d");

	viewport.width = CONFIG.CANVAS_WIDTH;
	viewport.height = CONFIG.CANVAS_HEIGHT;

	var full_window = document.createElement("canvas");
	full_window.width = CONFIG.CANVAS_WIDTH * 2;
	full_window.height = CONFIG.CANVAS_HEIGHT;

	sceneGenContext = full_window.getContext('2d');

	document.getElementById("main_game").style.display = "block";

	var sprites = new Sprite(sceneGenContext, imgObj.LandTiles);

	sprites.addObjects({
		"gground": [36, 19, 107, 90], //Grass Ground 1
		"sground": [36, 171, 107, 90], //Soil Ground 1
		"gstone": [36, 281, 107, 90],
		"sstone": [36, 409, 107, 90],
		"background": [0, 0, 1, 1]
	});

	var scene = new Scene(sceneGenContext, sprites, [imgObj.Cloud, sfxSounds]);

	scene.requestScene();
	var penguin = new Penguin(imgObj.Penguin, vp_context);
	var game = new Game(vp_context, [scene, penguin, sfxSounds]);

	document.addEventListener('keyup', function(event){
		game.keyHit( event.keyCode );
	});

	game.showScene();

}
