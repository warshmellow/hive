/*+*****************************************************************************
*                                                                              *
* JavaScript module to handle the user interface                               *
*                                                                              *
**-****************************************************************************/

"use strict";
var UI = UI || {};

/*
 * return the other color
 */

function other_color (color) {
    return(color == "white" ? "black" : "white");
}

/*
 * return the mode to display
 */

function mode_text (is_edit) {
    return(is_edit ? "edit" : "play");
}

/*
 * return the boolean to display
 */

function boolean_text (is_true) {
    return(is_true ? "yes" : "no");
}

/*
 * return the menu for a boolean value
 */

function boolean_menu (text, value) {
    return(text + ": " + boolean_text(value) + " &rarr; " + boolean_text(!value));
}

/*
 * return the menu for a color value
 */

function color_menu (text, value) {
    return(text + ": " + value + " &rarr; " + other_color(value));
}

/*
 * update a menu item text
 */

function update_menu (option) {
    var text = option.val();
    if (text == "center") {
        option.text("Center the board");
    } else if (text == "flip") {
        option.text("Flip the board");
    } else if (text == "rotatel") {
        option.text("Rotate the board (left)");
    } else if (text == "rotater") {
        option.text("Rotate the board (right)");
    } else if (text == "reload") {
        option.text("Reload the board");
    } else if (text == "decsize") {
        option.text("Decrease size");
    } else if (text == "incsize") {
        option.text("Increase size");
    } else if (text == "pass") {
        option.text("Pass");
    } else if (text == "ladybug" ||
               text == "mosquito" ||
               text == "pillbug") {
        var letter = text.charAt(0);
        var value = State.Current.type.indexOf(letter) >= 0;
        var bug = letter.toUpperCase() + text.slice(1);
        option.html(boolean_menu("Use " + bug, value));
    } else if (text == "next") {
        option.html(color_menu("Change whom to play next", State.Current.next));
    } else if (text == "ai") {
        option.html(color_menu("Change AI color", State.Current.ai));
    } else if (text == "label") {
        option.html(boolean_menu("Change label", State.Current.label));
    } else if (text == "grid") {
        option.html(boolean_menu("Change grid", State.Current.grid));
    } else if (text == "mode") {
        var value = State.Current.edit;
        option.html("Change mode: " + mode_text(value) +
                    " &rarr; " + mode_text(!value));
    }
}

/*
 * setup a menu item
 */

function setup_menu (value) {
    var option = $("<option>").val(value);
    update_menu(option);
    return(option);
}

/*
 * update the state from the UI board
 */

function update_from_board () {
    var str = UI.Board.string(false);
    State.Current.board = str.replace(/\s+/g, "");
    $("#textbox").val(str);
    window.location.href = State.url();
}

/*
 * execute a menu action
 */

function execute_menu (select) {
    var text = select.val();
    var option = select.children("option[value=" + text + "]");
    if (State.Current.debug)
        console.log("menu", text);
    if (text == "center") {
        if (State.Current.edit) {
            UI.Board.center();
            update_from_board();
        } else {
            // FIXME: why only for center and not for flip or rotate?
            AI.center();
        }
    } else if (text == "flip") {
        UI.Board.flip();
        update_from_board();
    } else if (text == "rotatel") {
        UI.Board.rotate("left");
        update_from_board();
    } else if (text == "rotater") {
        UI.Board.rotate("right");
        update_from_board();
    } else if (text == "reload") {
        window.location.href = State.url();
    } else if (text == "decsize") {
        State.Current.size = Math.round(State.Current.size * 0.9);
        window.location.href = State.url();
    } else if (text == "incsize") {
        State.Current.size = Math.round(State.Current.size * 1.1);
        window.location.href = State.url();
    } else if (text == "pass") {
        if (!State.Current.edit) {
            // FIXME: should probably be AI.pass()
            AI.move("PASS", "");
        }
    } else if (text == "ladybug" ||
               text == "mosquito" ||
               text == "pillbug") {
        var type = State.Current.type;
        var letter = text.charAt(0);
        var index = type.indexOf(letter);
        if (index < 0) {
            type += letter;
        } else {
            type = type.substr(0, index) + type.substr(index + 1);
        }
        var re = new RegExp("[bw]" + letter.toUpperCase(), "g");
        var str = " " + UI.Board.string(false) + " ";
        str = str.replace(re, "").replace(/\s+[\+\-]\d+[\+\-]\d+/g, "");
        State.Current.board = str.replace(/\s+/g, "");
        State.Current.type = type.split("").sort().join("");
        window.location.href = State.url();
    } else if (text == "next") {
        State.Current.next = other_color(State.Current.next);
    } else if (text == "ai") {
        State.Current.ai = other_color(State.Current.ai);
    } else if (text == "label") {
        State.Current.label = !State.Current.label;
        UI.Board.Config.Label = State.Current.label;
        UI.Board.adjust();
    } else if (text == "grid") {
        State.Current.grid = !State.Current.grid;
        update_hexgrid();
    } else if (text == "mode") {
        State.Current.edit = !State.Current.edit;
        update_mode(select);
    }
    update_menu(option);
}

/*
 * update the UI controls wrt mode
 */

function update_mode (select) {
    if (State.Current.edit) {
        select.children("option[value=pass]").attr("disabled", "disabled");
        select.children("option[value=flip]").removeAttr("disabled");
        select.children("option[value=rotatel]").removeAttr("disabled");
        select.children("option[value=rotater]").removeAttr("disabled");
        select.children("option[value=next]").removeAttr("disabled");
        select.children("option[value=ai]").removeAttr("disabled");
        $("#textbox").removeAttr("disabled");
    } else {
        select.children("option[value=pass]").removeAttr("disabled");
        select.children("option[value=flip]").attr("disabled", "disabled");
        select.children("option[value=rotatel]").attr("disabled", "disabled");
        select.children("option[value=rotater]").attr("disabled", "disabled");
        select.children("option[value=next]").attr("disabled", "disabled");
        select.children("option[value=ai]").attr("disabled", "disabled");
        $("#textbox").attr("disabled", "disabled");
        AI.setup();
    }
}

/*
 * update the board
 */

function update_board (str) {
    UI.Board.parse(str);
    str = UI.Board.string(false);
    State.Current.board = str.replace(/\s+/g, "");
    $("#textbox").val(str);
}

/*
 * update the hexagonal grid
 */

function update_hexgrid () {
    UI.Grid.Config.DrawTileLine   =  State.Current.grid;
    UI.Grid.Config.DrawTileText   =  State.Current.grid;
    UI.Grid.Config.DrawCenterLine = !State.Current.grid;
    UI.Grid.draw();
}

/*
 * handle the start of the drag
 */

function handle_drag (event) {
    var img = $("#" + event.target.id);
    event.dataTransfer = event.originalEvent.dataTransfer;
    event.dataTransfer.setData("text", img.data("pos"));
    return(true);
}

/*
 * handle the end of the drop
 */

function handle_drop (event, to) {
    event.dataTransfer = event.originalEvent.dataTransfer;
    var from = event.dataTransfer.getData("text");
    var move = "legal";
    if (State.Current.edit) {
        // minimum checks...
        if (from == to) {
            move = "null";
        } else if (to.charAt(0) == "@") {
            if (from.charAt(0) == "@") {
                move = "illegal";
            } else {
                var bugs = UI.Board.Pos2Bugs[from];
                var bug = bugs && bugs.length ? bugs[0].replace(/\d+$/, "") : "?";
                if (bug != to.substr(1)) move = "illegal";
            }
        } else {
            move = "legal";
        }
    } else {
        move = AI.move(from, to) ? "legal" : "illegal";
    }
    if (move == "legal") {
        if (State.Current.debug)
            console.log("legal move", from, "->", to);
        if (State.Current.edit) {
            UI.Board.move(from, to);
            var str = UI.Board.string(false);
            State.Current.board = str.replace(/\s+/g, "");
            $("#textbox").val(str);
        }
    } else {
        if (State.Current.debug)
            console.log(move, "move", from, "->", to);
    }
    event.preventDefault();
    return(false);
}

/*
 * setup drag & drop handlers
 */

function setup_drag_and_drop () {
    $("body").on({
        drop: function (e) {
            var tile = UI.Board.locate(e.originalEvent.pageX, e.originalEvent.pageY);
            if (tile) {
                if (State.Current.debug)
                    console.log("dropped at", tile.Label);
                return(handle_drop(e, tile.Label));
            }
            if (State.Current.debug)
                console.log("dropped elsewhere");
            e.preventDefault();
            return(false);
        },
        dragover: function (e) { e.preventDefault(); },
    });
    $("img").on({
        dragstart: handle_drag,
        drop: function (e) {
            var img = $("#" + event.target.id);
            var pos = img.data("pos");
            if (State.Current.debug)
                console.log("dropped on img at", pos);
            return(handle_drop(e, pos));
        },
        dragover: function (e) { e.preventDefault(); },
    });
}

/*
 * setup everything
 */

UI.setup = function (control, canvas, bugs) {
    $("#spinner").show();
    $.ajax({
        dataType: "json",
        url: "alias.json",
        success: function (data) {
            $.extend(Hive.ALIAS, data);
        },
    });
    var select, textbox, ctx;
    UI.ControlHeight = 25;
    control.css("z-index", 10);
    // menu
    select = $("<select>");
    select.width(UI.SideWidth / 2);
    select.offset({ left: UI.SideWidth / 4, top: 4 });
    select.css("z-index", 10);
    select.append(setup_menu(""));
    if (State.Current.ai != "none") {
        select.append(setup_menu("pass"));
    }
    select.append(setup_menu("reload"));
    select.append(setup_menu("center"));
    select.append(setup_menu("flip"));
    select.append(setup_menu("rotatel"));
    select.append(setup_menu("rotater"));
    select.append(setup_menu("decsize"));
    select.append(setup_menu("incsize"));
    select.append(setup_menu("ladybug"));
    select.append(setup_menu("mosquito"));
    select.append(setup_menu("pillbug"));
    select.append(setup_menu("label"));
    select.append(setup_menu("grid"));
    if (State.Current.ai != "none") {
        select.append(setup_menu("mode"));
        select.append(setup_menu("next"));
        select.append(setup_menu("ai"));
    }
    select.on("change", function () {
        execute_menu($(this));
	$(this).val("");
    });
    control.append(select);
    // text box
    textbox = $("<textarea>");
    textbox.attr("type", "text");
    textbox.attr("id", "textbox");
    textbox.width($(window).width() - UI.SideWidth * 2 - 4);
    textbox.offset({ left: UI.SideWidth, top: (UI.ControlHeight - 15) / 2 });
    textbox.css("z-index", 10);
    textbox.css("font-size", Math.round(UI.ControlHeight / 2) + "px");
    textbox.on("change", function () {
        update_board(textbox.val());
    });
    textbox.keypress(function (e) {
        if (e.which == 13) {
            update_board(textbox.val());
            return(false);
        }
	return(true);
    });
    control.append(textbox);
    // canvas
    canvas.offset({ left: 0, top: 0 });
    ctx = canvas[0].getContext("2d");
    ctx.canvas.width = $(window).width();
    ctx.canvas.height = $(window).height();
    UI.Grid = new Hex.Grid({
        CanvasCtx: ctx,
        GridRect: new Hex.Rect(
            UI.SideWidth,
            UI.ControlHeight,
            $(window).width() - UI.SideWidth * 2,
            $(window).height() - UI.ControlHeight
        ),
        TileSize: State.Current.size,
        DrawGridLine: false,
        TileLineWidth: 0.1,
        Labeler: function (r, c) {
            var pos = new Hive.Pos(r, c);
            return(pos.string());
        },
    });
    update_hexgrid();
    // bugs
    UI.Board = new Hive.Board({
	Container: bugs,
	Grid: UI.Grid,
	Label: State.Current.label,
	Type: State.Current.type,
    });
    update_board(State.Current.board);
    // finish
    update_mode(select);
    setup_drag_and_drop();
    $("#spinner").hide();
}
