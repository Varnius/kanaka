var d= document.getElementById('game').contentWindow.document;
var c = d.body.appendChild(d.createElement('canvas'));
c.id = 'canvas';
c.width = '400';
c.height = '300';
var ctx = c.getContext('2d');
  ctx.font = '48px serif';
  ctx.fillText('Hello canvas', 10, 50);
