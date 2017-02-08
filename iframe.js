var pi = document.body.appendChild(document.createElement('script'));

pi.onload = function() {
    var type = "WebGL"
    if(!PIXI.utils.isWebGLSupported()){
      type = "canvas"
    }

    PIXI.utils.sayHello(type)
   
   var app = new PIXI.Application();

// The application will create a canvas element for you that you 
// can then insert into the DOM.
document.body.appendChild(app.view);

// load the texture we need
PIXI.loader.add('bunny', 'https://varnius.github.io/kanaka/assets/musa.png').load(function(loader, resources) {

    // This creates a texture from a 'bunny.png' image.
    var bunny = new PIXI.Sprite(resources.bunny.texture);

    // Setup the position of the bunny
    bunny.x = app.renderer.width / 2;
    bunny.y = app.renderer.height / 2;

    // Rotate around the center
    bunny.anchor.x = 0.5;
    bunny.anchor.y = 0.5;

    // Add the bunny to the scene we are building.
    app.stage.addChild(bunny);

    // Listen for frame updates
    app.ticker.add(function() {
         // each frame we spin the bunny around a bit
        bunny.rotation += 0.01;
    });
});
}
pi.src = 'https://varnius.github.io/kanaka/pixi.min.js';                                                          

                                                          
// var c = document.body.appendChild(document.createElement('canvas'));
// c.id = 'canvas';
// c.width = '400';
// c.height = '300';
// var ctx = c.getContext('2d');
//   ctx.font = '48px serif';
//   ctx.fillText('Hello canvas', 10, 50);
