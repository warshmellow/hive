/*+*****************************************************************************
*                                                                              *
* JavaScript classes to ease the manipulation of hexagonal tiles               *
*                                                                              *
**-****************************************************************************/

"use strict";
var Hex = Hex || {};

/*+*****************************************************************************
*                                                                              *
* constants                                                                    *
*                                                                              *
**-****************************************************************************/

Hex.SQRT3 = Math.sqrt(3);

Hex.DEFAULT = {
    CanvasCtx:         undefined,  // must be given
    CenterLineColor:      "grey",
    CenterLineWidth:         0.5,
    DrawCenterLine:        false,
    DrawGridLine:           true,
    DrawTileLine:           true,
    DrawTileText:           true,
    GridLineColor:       "black",
    GridLineWidth:             1,
    GridRect:          undefined,  // must be given
    TileLineColor:       "black",
    TileLineWidth:             1,
    TileSize:          undefined,  // must be given
    TileTextColor:       "black",
    TileTextFont:        "Arial",
    TileTextSize:      undefined,  // default is proportional to tile size
};

Hex.DEFAULT.Labeler = function (c, r) {
    return(c + "," + r);
}

/*+*****************************************************************************
*                                                                              *
* point abstraction                                                            *
*                                                                              *
**-****************************************************************************/

/*
 * constructor
 */

Hex.Point = function (x, y) {
    this.X = x;
    this.Y = y;
};

/*
 * return a new point shifted from the current one
 */

Hex.Point.prototype.shift = function (dx, dy) {
    return(new Hex.Point(this.X + dx, this.Y + dy));
};

/*+*****************************************************************************
*                                                                              *
* rectangle abstraction                                                        *
*                                                                              *
**-****************************************************************************/

/*
 * constructor
 */

Hex.Rect = function (x, y, width, height) {
    this.X = x;
    this.Y = y;
    this.Width = width;
    this.Height = height;
};

/*
 * test if a point is inside the rectangle
 */

Hex.Rect.prototype.contains = function (p) {
    if (p.X < this.X || p.Y < this.Y) return(false);
    if (p.X > this.X + this.Width || p.Y > this.Y + this.Height) return(false);
    return(true);
};

/*+*****************************************************************************
*                                                                              *
* hexagonal tile abstraction                                                   *
*                                                                              *
**-****************************************************************************/

/*
 * constructor
 */

Hex.Tile = function (size, center, label) {
    this.Center = center;
    this.Label = label;
    // also store its points
    var dx = size * Hex.SQRT3 / 2;
    var dy = size / 2;
    this.Points = [];
    this.Points.push(center.shift(  0, -size));  // North
    this.Points.push(center.shift( dx,   -dy));  // North-East
    this.Points.push(center.shift( dx,    dy));  // South-East
    this.Points.push(center.shift(  0,  size));  // South
    this.Points.push(center.shift(-dx,    dy));  // South-West
    this.Points.push(center.shift(-dx,   -dy));  // North-West
    // also store its bounding box that is used to speed up contains()
    this.Box = new Hex.Rect(center.X - dx, center.Y - size, 2 * dx, 2 * size);
};

/*
 * draw the hexagon
 */

Hex.Tile.prototype.draw = function (config) {
    var ctx = config.CanvasCtx;
    // maybe draw its lines
    if (config.DrawTileLine) {
	if (typeof config.TileLineColor != "undefined")
            ctx.strokeStyle = config.TileLineColor;
	if (typeof config.TileLineWidth != "undefined")
            ctx.lineWidth = config.TileLineWidth;
	ctx.beginPath();
	ctx.moveTo(this.Points[0].X, this.Points[0].Y);
	for (var i = 1; i < this.Points.length; i++) {
	    var p = this.Points[i];
	    ctx.lineTo(p.X, p.Y);
	}
	ctx.closePath();
	ctx.stroke();
    }
    // maybe draw its text
    if (config.DrawTileText) {
	if (typeof config.TileTextColor != "undefined")
	    ctx.fillStyle = config.TileTextColor;
        var font = "sans-serif";
	if (typeof config.TileTextFont != "undefined")
	    font = config.TileTextFont;
	if (typeof config.TileTextSize != "undefined")
	    ctx.font = config.TileTextSize + " " + font;
        else
	    ctx.font = Math.round(config.TileSize / 5 + 2) + "pt " + font;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(this.Label, this.Center.X, this.Center.Y);
    }
};

/*
 * test if a point is inside the hexagon
 *
 * http://developingfor.net/2007/06/07/testing-to-see-if-a-point-is-within-a-polygon/
 */

Hex.Tile.prototype.contains = function (p) {
    if (!this.Box.contains(p)) return(false);
    var result = false;
    var i, j, ip, jp;
    for (i=0, j=this.Points.length-1; i<this.Points.length; j=i++) {
	ip = this.Points[i];
	jp = this.Points[j];
	if (((ip.Y <= p.Y && p.Y < jp.Y) || (jp.Y <= p.Y && p.Y < ip.Y)) &&
	    (p.X < (jp.X - ip.X) * (p.Y - ip.Y) / (jp.Y - ip.Y) + ip.X)) {
	    result = !result;
	}
    }
    return(result);
};

/*+*****************************************************************************
*                                                                              *
* hexagonal grid abstraction                                                   *
*                                                                              *
**-****************************************************************************/

/*
 * constructor
 */

Hex.Grid = function (config) {
    this.Config = $.extend({}, Hex.DEFAULT, config);
    // compute the half-number of "rows" and "columns"
    var rect = this.Config.GridRect;
    var size = this.Config.TileSize;
    var center = new Hex.Point(rect.X + rect.Width/2, rect.Y + rect.Height/2);
    var rows = Math.floor((rect.Height - 2 * size) / 3 / size);
    var cols = Math.floor((Math.floor(rect.Width / size / Hex.SQRT3) - 1) / 2);
    // fill the grid with hexagonal tiles
    this.Tiles = {};
    for (var r=-rows; r<=rows; r++) {
	var dr = Math.abs(r) % 2;
	var ry = center.Y + r * 3 * size / 2;
	var lastc = cols - dr;
	for (var c=-cols; c<=lastc; c++) {
	    var cx = center.X + (c + dr / 2) * Hex.SQRT3 * size;
	    var hc = c - Math.floor(r / 2);
	    var label = this.Config.Labeler(hc, r);
	    this.Tiles[label] = new Hex.Tile(size, new Hex.Point(cx, ry), label);
	}
    }
};

/*
 * draw the grid
 */

Hex.Grid.prototype.draw = function () {
    var ctx = this.Config.CanvasCtx;
    var rect = this.Config.GridRect;
    ctx.clearRect(rect.X, rect.Y, rect.Width, rect.Height);
    // maybe draw its center
    if (this.Config.DrawCenterLine) {
	var center = new Hex.Point(rect.X + rect.Width/2, rect.Y + rect.Height/2);
	var size = this.Config.TileSize / 4;
	ctx.save();
	if (typeof this.Config.CenterLineColor != "undefined")
            ctx.strokeStyle = this.Config.CenterLineColor;
	if (typeof this.Config.CenterLineWidth != "undefined")
            ctx.lineWidth = this.Config.CenterLineWidth;
	ctx.beginPath();
	ctx.moveTo(center.X - size, center.Y);
	ctx.lineTo(center.X + size, center.Y);
	ctx.moveTo(center.X, center.Y - size);
	ctx.lineTo(center.X, center.Y + size);
	ctx.closePath();
	ctx.stroke();
	ctx.restore();
    }
    // maybe draw its border
    if (this.Config.DrawGridLine) {
	ctx.save();
	if (typeof this.Config.GridLineColor != "undefined")
            ctx.strokeStyle = this.Config.GridLineColor;
	if (typeof this.Config.GridLineWidth != "undefined")
            ctx.lineWidth = this.Config.GridLineWidth;
	ctx.beginPath();
	ctx.rect(rect.X, rect.Y, rect.Width, rect.Height);
	ctx.closePath();
	ctx.stroke();
	ctx.restore();
    }
    // maybe draw its tiles
    if (this.Config.DrawTileLine || this.Config.DrawTileText) {
	ctx.save();
	for (var h in this.Tiles) {
            this.Tiles[h].draw(this.Config);
	}
	ctx.restore();
    }
};

/*
 * return the hexagonal tile at the given point (or null)
 */

Hex.Grid.prototype.locate = function (x, y) {
    var p = new Hex.Point(x, y);
    for (var h in this.Tiles) {
	if (this.Tiles[h].contains(p)) return(this.Tiles[h]);
    }
    return(null);
};

/*
 * return the hexagonal tile with the given label
 */

Hex.Grid.prototype.hex = function (label) {
    return(this.Tiles[label]);
};
