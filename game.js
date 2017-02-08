window.addEventListener('load', function ()
{

    var app = new PIXI.Application(960, 600, { backgroundColor: 0x1099bb, roundPixels: true });
    var renderer = app.renderer;
    var NUM_TILES_X = 100;
    var NUM_TILES_Y = 100;
    var TILE_SIZE = 64;
    var PREVENT_DEFAULT_FOR = [37, 38, 39, 40];

    // The application will create a canvas element for you that you
    // can then insert into the DOM.
    document.body.appendChild(app.view);

    // Load things

    var assetLocation = !window.dev ? 'https://varnius.github.io/kanaka/' : '';

    PIXI.loader.add('drill', assetLocation + 'assets/musa.png');
    PIXI.loader.add('regularTile', assetLocation + 'assets/tile-test.png');
    PIXI.loader.once('complete', onAssetsLoaded);
    PIXI.loader.load();

    var bunny;
    var stage = app.stage;

    function onAssetsLoaded(loader, resources)
    {
        init();

        function init()
        {
            // Events

            window.addEventListener('keydown', onKeyDown);
            window.addEventListener('keyup', onKeyUp);

            // Listen for frame updates
            app.ticker.add(tick);
            createGrid();
            createDrill();
        }

        // Render loop

        function tick()
        {
            handleMovement();
        }

        var hMov = 0, vMov = 0;
        var maxVelocity = 290;
        var lastTime = 0;
        var damping = 0.8;
        var gravity = 2;
        var velocity = 0;
        var acceleration = 10;

        function handleMovement()
        {
            var now = new Date().getTime();
            var delta = (now - lastTime) / 1000;

            if (hMov !== 0)
                velocity += acceleration * hMov;
            else
                velocity *= damping;

            if (Math.abs(velocity) > maxVelocity) velocity = maxVelocity * hMov;
            if (Math.abs(velocity) < 0.01) velocity = 0;

            drill.position.x += velocity * delta;

            lastTime = now;
        }

        // Input events

        function onKeyDown(event)
        {
            if (PREVENT_DEFAULT_FOR.includes(event.keyCode)) event.preventDefault();

            if (event.keyCode === 37)
                hMov = -1;
            else if (event.keyCode === 39)
                hMov = 1;

            if (event.keyCode === 38)
                vMov = -1;
            else if (event.keyCode === 40)
                vMov = 1;
        }

        function onKeyUp(event)
        {
            if (PREVENT_DEFAULT_FOR.includes(event.keyCode)) event.preventDefault();
            if (event.keyCode === 37 || event.keyCode === 39) hMov = 0;
            if (event.keyCode === 38 || event.keyCode === 40) vMov = 0;
        }

        // Generate level

        function createGrid()
        {
            var tile;
            var tiles = new PIXI.Container();
            stage.addChild(tiles);

            for (var i = -NUM_TILES_X / 2; i < NUM_TILES_X; i++)
            {
                for (var j = 0; j < NUM_TILES_Y; j++)
                {
                    var texture = resources.regularTile.texture;

                    tile = new PIXI.Sprite(texture);
                    tile.position.x = i * TILE_SIZE;
                    tile.position.y = j * TILE_SIZE;

                    tiles.addChild(tile);
                }
            }

            tiles.position.y = 128;
        }

        var drill;

        function createDrill()
        {
            drill = new PIXI.Container();

            stage.addChild(drill);
            drill.addChild(new PIXI.Sprite(resources.drill.texture));
            drill.position.x = TILE_SIZE * 7;
            drill.position.y = TILE_SIZE;
        }
    }
});

var score = 0;
setInterval(function ()
{
    score += 2;
    window.parent.postMessage('Your score: ' + score, "*");
}, 2000);

//window.addEventListener("message", function(ev){
//  document.body.appendChild(document.createTextNode(ev.data))
//}, false);
