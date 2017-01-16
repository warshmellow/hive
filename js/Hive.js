/*+*****************************************************************************
*                                                                              *
* JavaScript classes supporting the Hive game                                  *
*                                                                              *
**-****************************************************************************/

"use strict";
var Hive = Hive || {};

/*+*****************************************************************************
*                                                                              *
* constants                                                                    *
*                                                                              *
**-****************************************************************************/

Hive.IMG_WIDTH  = 162;
Hive.IMG_HEIGHT = 189;

Hive.IMG_LIST = [
    "wA1", "wA2", "wA3", "wB1", "wB2", "wG1", "wG2", "wG3",
    "wL", "wM", "wP", "wQ", "wS1", "wS2",
    "bA1", "bA2", "bA3", "bB1", "bB2", "bG1", "bG2", "bG3",
    "bL", "bM", "bP", "bQ", "bS1", "bS2",
];

Hive.ALIAS = {};
    
Hive.DEFAULT = {
    Container:  undefined,  // must be given
    Grid:       undefined,  // must be given
    Label:          false,
    Type:              "",  // list of non-standard bugs used (out of l, m & p)
};

/*+*****************************************************************************
*                                                                              *
* position abstraction (with x aka column, z aka row and x + y + z = 0)        *
*                                                                              *
**-****************************************************************************/

/*
 * constructor
 */

Hive.Pos = function (col, row) {
    if (typeof row != "undefined") {
        // both column and row are given, assume integers
        this.Col = col;
        this.Row = row;
        return;
    }
    // only column is given, assume a string to be parsed
    var re = /^([\+\-]\d+)([\+\-]\d+)$/;
    var match = re.exec(col);
    if (match) {
        this.Col = parseInt(match[1]);
        this.Row = parseInt(match[2]);
        return;
    }
    throw "unexpected position: " + col;
};

/*
 * return the position textual representation
 */

Hive.Pos.prototype.string = function () {
    return((this.Col < 0 ? "" + this.Col : "+" + this.Col)
         + (this.Row < 0 ? "" + this.Row : "+" + this.Row));
};

/*
 * return a new shifted position
 */

Hive.Pos.prototype.shift = function (dc, dr) {
    return(new Hive.Pos(this.Col + dc, this.Row + dr));
};

/*
 * return a new position flipped around the horizontal axis
 * (x, y, z) -> (-y, -x, -z)
 */

Hive.Pos.prototype.flip = function () {
    return(new Hive.Pos(this.Col + this.Row, -this.Row));
};

/*
 * return a new position rotated 60 degrees
 *  left: (x, y, z) -> (-y, -z, -x)
 * right: (x, y, z) -> (-z, -x, -y)
 */

Hive.Pos.prototype.rotate = function (direction) {
    if (direction == "left")
        return(new Hive.Pos(this.Col + this.Row, -this.Col));
    if (direction == "right")
        return(new Hive.Pos(-this.Row, this.Col + this.Row));
    throw "unexpected direction: " + direction;
};

/*+*****************************************************************************
*                                                                              *
* bug abstraction                                                              *
*                                                                              *
**-****************************************************************************/

/*
 * constructor
 */

Hive.Bug = function (name, size) {
    this.Name = name;
    var img = $("<img>");
    img.attr("src", "img/" + name + ".png");
    var r = 2 * size / Hive.IMG_HEIGHT;
    img.width(Hive.IMG_WIDTH * r);
    img.height(Hive.IMG_HEIGHT * r);
    img.attr("id", name);
    img.attr("title", name);
    this.Image = img;
    this.StackOffset = size / 10;
};

/*
 * place a bug on the board
 */

Hive.Bug.prototype.place = function (xc, yc, z) {
    this.Image.offset({
	left: xc - this.Image.width()  / 2 + this.StackOffset * z,
	top:  yc - this.Image.height() / 2 - this.StackOffset * z,
    });
    this.Image.css("z-index", z);
};

/*
 * set the "is draggable" flag
 */

Hive.Bug.prototype.draggable = function (flag) {
    this.Image.attr("draggable", flag ? "true" : "false");
};

/*+*****************************************************************************
*                                                                              *
* board abstraction                                                            *
*                                                                              *
**-****************************************************************************/

/*
 * constructor
 */

Hive.Board = function (config) {
    this.Config = $.extend({}, Hive.DEFAULT, config);
    this.Config.Type = this.Config.Type.split("").sort().join("");
    this.Bug = {};        // bug name => Hive.Bug object
    this.Pos2Bugs = {};   // position => list of bug names (first on top)
    this.Bug2Pos = {};    // bug name => position
    this.Pos2Label = {};  // position => label element
    this.OffTile = {};    // bug type => off-board Hex.Tile
    if (!this.Config.Type.match(/^l?m?p?$/))
	throw "unexpected board type: " + this.Config.Type;
    var letters = "qbsag" + this.Config.Type;
    var grid = this.Config.Grid;
    var size = grid.Config.TileSize;
    var wobx = grid.Config.GridRect.X - size * 1.1;
    var bobx = grid.Config.GridRect.X + size * 0.9 + grid.Config.GridRect.Width;
    var oby = grid.Config.GridRect.Y + size;
    oby += (grid.Config.GridRect.Height - 2 * size * letters.length) / 2;
    for (var i = 0; i < letters.length; i++) {
	var l = letters.charAt(i).toUpperCase();
	for (var b in Hive.IMG_LIST) {
            var bug = Hive.IMG_LIST[b];
	    if (bug.charAt(1) == l) {
		this.Bug[bug] = new Hive.Bug(bug, size);
		this.Config.Container.append(this.Bug[bug].Image);
	    }
	}
        this.OffTile["w" + l] =
            new Hex.Tile(size, new Hex.Point(wobx, oby), "@w" + l);
        this.OffTile["b" + l] =
            new Hex.Tile(size, new Hex.Point(bobx, oby), "@b" + l);
	oby += size * 2.1;
    }
    this.reset();
    this.adjust();
};

/*
 * return the hexagonal tile at the given point (or null)
 */

Hive.Board.prototype.locate = function (x, y) {
    // maybe on-board
    var tile = this.Config.Grid.locate(x, y);
    if (tile) return(tile);
    // maybe off-board
    var p = new Hex.Point(x, y);
    for (var pos in this.OffTile) {
        tile = this.OffTile[pos];
        if (tile.contains(p)) return(tile);
    }
    // elsewhere
    return(null);
};

/*
 * place all the bugs off-board
 */

Hive.Board.prototype.reset = function () {
    this.Pos2Bugs = {};
    this.Bug2Pos = {};
    for (var bug in this.Bug) {
	var pos = "@" + bug.substr(0, 2);
	if (!this.Pos2Bugs[pos]) this.Pos2Bugs[pos] = [];
	this.Pos2Bugs[pos].push(bug);
        this.Bug2Pos[bug] = pos;
    }
    for (var pos in this.Pos2Bugs) {
	this.Pos2Bugs[pos].sort();
    }
};

/*
 * adjust all the bug positions
 */

Hive.Board.prototype.adjust = function () {
    for (var pos in this.Pos2Bugs) {
	if (this.Pos2Bugs[pos].length > 0) {
	    this.place(pos, this.Pos2Bugs[pos]);
	} else {
	    if (this.Pos2Label[pos])
		this.Pos2Label[pos].hide();
	}
    }
};

/*
 * place a list of bugs at the given position
 */

Hive.Board.prototype.place = function (pos, bugs) {
    var bc;
    if (pos.charAt(0) == "@") {
	if (pos.substr(1, 2) in this.OffTile) {
	    bc = this.OffTile[pos.substr(1, 2)].Center;
	} else {
	    throw "unexpected position: " + pos;
	}
    } else {
	var hex = this.Config.Grid.hex(pos);
	if (hex) {
	    bc = hex.Center;
	} else {
	    throw "unexpected position: " + pos;
	}
    }
    var len = bugs.length;
    for (var i = 0; i < len; i++) {
	var bi = bugs[i];
	var bo = this.Bug[bi];
	if (!bo) throw "unexpected bug: " + bi;
	if (bo.Image.data("pos") != pos) {
	    bo.place(bc.X, bc.Y, len - i - 1);
	    bo.Image.data("pos", pos);
	}
	bo.draggable(i == 0 ? true : false);
    }
    var label = this.Pos2Label[pos];
    if (!this.Config.Label) {
	if (label) label.hide();
	return;
    }
    if (!label) {
        var size = this.Config.Grid.Config.TileSize;
	label = $("<div>");
	label.addClass("label");
        label.css("z-index", 9);
        label.css("font-size", Math.round(size / 3.6) + "px");
	this.Config.Container.append(label);
	this.Pos2Label[pos] = label;
    }
    label.text(bugs.join(""));
    label.show();
    label.offset({
	left: bc.X - label.width()  / 2,
	top: bc.Y + this.Config.Grid.Config.TileSize / 7.2,
    });
};

/*
 * parse a board textual description
 */

Hive.Board.prototype.parse = function (str) {
    this.reset();
    if (str.charAt(0) == "*") {
	var alias = str.substr(1);
	if (alias in Hive.ALIAS) {
	    str = Hive.ALIAS[alias];
	} else {
	    throw "unexpected alias: " + alias;
	}
    }
    var re1 = /^([a-z1-9]+)([\+\-]\d+[\+\-]\d+(?!@)|@[bw][a-z])/i;
    var re2 = /^([bw][a-z][1-9]?)/i;
    var match;
    str = str.replace(/\s+/g, "");
    while (str.length > 0) {
	match = re1.exec(str);
	if (!match) throw "unexpected board: " + str;
	var names = match[1];
	var pos = match[2];
	var bugs = [];
	str = str.substr(names.length + pos.length);
        if (names.match(/^[123]$/) && pos.match(/^@/)) {
            bugs = this.Pos2Bugs[pos].slice(-parseInt(names));
            continue;
        } else {
	    while (names.length > 0) {
	        match = re2.exec(names);
	        if (!match) throw "unexpected bugs: " + names;
	        bugs.push(match[1]);
	        names = names.substr(match[0].length);
	    }
        }
	this.place(pos, bugs);
	if (this.Pos2Bugs[pos])
	    throw "duplicate position: " + pos;
	this.Pos2Bugs[pos] = [];
	for (var i = 0; i < bugs.length; i++) {
	    var offpos = "@" + bugs[i].substr(0, 2);
	    this.Pos2Bugs[offpos] = $.grep(this.Pos2Bugs[offpos], function (value, _) {
		return(value != bugs[i]);
	    });
	    this.Pos2Bugs[pos].push(bugs[i]);
            this.Bug2Pos[bugs[i]] = pos;
	}
    }
    this.adjust();
};

/*
 * return the board textual description
 */

Hive.Board.prototype.string = function (full) {
    var spos = [];
    for (var pos in this.Pos2Bugs) {
	if (full || pos.charAt(0) != "@")
	    spos.push(pos);
    }
    spos.sort();
    var result = [];
    for (var i = 0; i < spos.length; i++) {
	if (this.Pos2Bugs[spos[i]].length > 0)
	    result.push(this.Pos2Bugs[spos[i]].join("") + spos[i]);
    }
    return(result.join(" "));
};

/*
 * center the board
 */

Hive.Board.prototype.center = function () {
    var count = 0;
    var sumc = 0;
    var sumr = 0;
    var po, p;
    for (var pos in this.Pos2Bugs) {
	if (pos.charAt(0) == "@") continue;
	if (this.Pos2Bugs[pos].length == 0) continue;
        po = new Hive.Pos(pos);
	count++;
	sumc += po.Col;
	sumr += po.Row;
    }
    if (count == 0) return;
    var dc = Math.round(sumc / count);
    var dr = Math.round(sumr / count);
    if (dc == 0  && dr == 0) return;
    var p2b = {};
    this.Bug2Pos = {};
    for (var pos in this.Pos2Bugs) {
	if (this.Pos2Bugs[pos].length == 0) continue;
	if (pos.charAt(0) == "@") {
	    p2b[pos] = this.Pos2Bugs[pos];
            p = pos;
	} else {
            p = (new Hive.Pos(pos)).shift(-dc, -dr).string();
	    p2b[p] = this.Pos2Bugs[pos];
        }
        for (var i = 0; i < this.Pos2Bugs[pos].length; i++) {
            this.Bug2Pos[this.Pos2Bugs[pos][i]] = p;
        }
    }
    this.Pos2Bugs = p2b;
};

/*
 * flip the board around its horizontal axis
 */

Hive.Board.prototype.flip = function () {
    var p, p2b = {};
    this.Bug2Pos = {};
    for (var pos in this.Pos2Bugs) {
	if (this.Pos2Bugs[pos].length == 0) continue;
	if (pos.charAt(0) == "@") {
	    p2b[pos] = this.Pos2Bugs[pos];
            p = pos;
	} else {
            p = (new Hive.Pos(pos)).flip().string();
	    p2b[p] = this.Pos2Bugs[pos];
        }
        for (var i = 0; i < this.Pos2Bugs[pos].length; i++) {
            this.Bug2Pos[this.Pos2Bugs[pos][i]] = p;
        }
    }
    this.Pos2Bugs = p2b;
};

/*
 * rotate the board
 */

Hive.Board.prototype.rotate = function (direction) {
    var p, p2b = {};
    this.Bug2Pos = {};
    for (var pos in this.Pos2Bugs) {
	if (this.Pos2Bugs[pos].length == 0) continue;
	if (pos.charAt(0) == "@") {
	    p2b[pos] = this.Pos2Bugs[pos];
            p = pos;
	} else {
            p = (new Hive.Pos(pos)).rotate(direction).string();
	    p2b[p] = this.Pos2Bugs[pos];
        }
        for (var i = 0; i < this.Pos2Bugs[pos].length; i++) {
            this.Bug2Pos[this.Pos2Bugs[pos][i]] = p;
        }
    }
    this.Pos2Bugs = p2b;
};

/*
 * execute a move
 */

Hive.Board.prototype.move = function (from, to) {
    if (from in this.Pos2Bugs && this.Pos2Bugs[from].length > 0) {
	var bug = this.Pos2Bugs[from].shift();
	if (!this.Pos2Bugs[to]) this.Pos2Bugs[to] = [];
	this.Pos2Bugs[to].unshift(bug);
        this.Bug2Pos[bug] = to;
    } else {
	throw "unexpected move from: " + from;
    }
    this.adjust();
};
