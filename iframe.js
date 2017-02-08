var pi = document.body.appendChild(document.createElement('script'));
pi.src = 'https://cdnjs.cloudflare.com/ajax/libs/pixi.js/4.2.2/pixi.min.js';                                                          
pi.onload = function() {
    var type = "WebGL"
    if(!PIXI.utils.isWebGLSupported()){
      type = "canvas"
    }

    PIXI.utils.sayHello(type);
  alert('123');
}
                                                          
// var c = document.body.appendChild(document.createElement('canvas'));
// c.id = 'canvas';
// c.width = '400';
// c.height = '300';
// var ctx = c.getContext('2d');
//   ctx.font = '48px serif';
//   ctx.fillText('Hello canvas', 10, 50);
