/*+*****************************************************************************
*                                                                              *
* JavaScript module to handle the artificial intelligence                      *
*                                                                              *
**-****************************************************************************/

"use strict";
var AI = AI || {};

/*
 * send the first message in the queue
 */

function flush_queue () {
    if (AI.Outgoing.length > 0) {
        var tokens = AI.Outgoing.shift();
        console.log("->AI:", tokens.join(" "));
        AI.Sent.push(tokens[0]);
        AI.Socket.send(tokens.join(" ") + "\n");
        $("#spinner").show();
    }
}

/*
 * queue a message for the AI
 */

function queue_message (tokens) {
    AI.Outgoing.push(tokens);
}

/*
 * parse a message coming from the AI
 */

function parse_message (message) {
    var lines = message.split("\n");
    for (var i=0; i<lines.length; i++) {
        if (lines[i] == "OK") {
            var tokens = AI.Incoming.slice();
            tokens.unshift(AI.Sent.shift());
            AI.Incoming = [];
            handle_message(tokens);
        } else if (lines[i].startsWith("ERROR")) {
            alert(AI.Sent.shift() + " => " + lines[i]);
        } else {
            AI.Incoming.push(lines[i]);
        }
    }
    flush_queue();   
}

/*
 * handle a reply from the AI
 */

function handle_message (tokens) {
    $("#spinner").hide();
    console.log("AI->:", tokens);
    var command = tokens.shift();
    if (command.match(/^(center|move|play|state)$/)) {
        // nothing to do...
    } else if (command == "print") {
        // set the board to the new one
        var str;
        if (tokens[0].startsWith(":b")) {
            State.Current.next = "black";
        } else if (tokens[0].startsWith(":w")) {
            State.Current.next = "white";
        } else {
            throw "unexpected state: " + tokens[0];
        }
        str = tokens[0].replace(/^:[wb]([+-]\d+[+-]\d+)?\s+/, "");
        UI.Board.parse(str);
        str = UI.Board.string(false);
        State.Current.board = str.replace(/\s+/g, "");
        $("#textbox").val(str);
    } else if (command == "list") {
        // record the list of legal moves
        AI.Moves = tokens;
    } else {
        alert("unexpected command: " + command);
    }
}

/*
 * perform a move
 */

AI.move = function (from, to) {
    var move = from + to;
    if ($.inArray(move, AI.Moves) < 0)
        return(false);
    queue_message([ "move", move ]);
    queue_message([ "play" ]);
    queue_message([ "print" ]);
    queue_message([ "list" ]);
    flush_queue();
    return(true);
};

/*
 * center the board
 */

AI.center = function () {
    queue_message([ "center" ]);
    queue_message([ "print" ]);
    flush_queue();
};

/*
 * setup everything
 */

AI.setup = function (color, board) {
    if (!AI.Socket) {
        AI.Socket = new WebSocket("ws://localhost:8080/");
        AI.Socket.onopen = function (e) {
            console.log("onopen: socket now open ", AI.Socket.readyState);
            flush_queue();
        };
        AI.Socket.onerror = function (e) {
            console.log("onerror: ");
            AI.Socket = null;
        };
        AI.Socket.onclose = function (e) {
            console.log("onclose: ");
        };
        AI.Socket.onmessage = function (e) {
            parse_message(e.data);
        };
    }
    console.log(color, board);
    AI.Incoming = [];
    AI.Outgoing = [];
    AI.Sent = [];
    var state = ":" + State.Current.next.charAt(0);
    state += " " + UI.Board.string(true);
    queue_message([ "state", state ]);
    if (State.Current.next == State.Current.ai) {
        queue_message([ "play" ]);
    }
    queue_message([ "print" ]);
    queue_message([ "list" ]);
};
