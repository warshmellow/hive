/*+*****************************************************************************
*                                                                              *
* JavaScript module to handle the browser state                                *
*                                                                              *
**-****************************************************************************/

"use strict";
var State = State || {};

/*+*****************************************************************************
*                                                                              *
* constants                                                                    *
*                                                                              *
**-****************************************************************************/

State.DEFAULT = {
    ai:     "none",  // color played by the AI or "none" for no AI
    board:      "",
    debug:    true,
    edit:     true,
    grid:     true,
    label:   false,
    next:  "white",  // color of the active player
    type:       "",  // type of game as list of optional bugs (l, m or p)
};

State.DEFAULT.size =
    Math.round(Math.min($(window).width(), $(window).height()) / 20);

/*+*****************************************************************************
*                                                                              *
* variables                                                                    *
*                                                                              *
**-****************************************************************************/

State.Current = $.extend({}, State.DEFAULT);

/*+*****************************************************************************
*                                                                              *
* functions                                                                    *
*                                                                              *
**-****************************************************************************/

/*
 * parse the current URL to update the current state
 */

State.parse = function () {
    // first from DEFAULT
    State.Current = $.extend({}, State.DEFAULT);
    // then from URL
    var s = window.location.search.replace(/\/+$/, "");
    if (s.length > 1) {
        $.each(s.substr(1).split("&"), function (_index, value) {
            var l = value.split("=");
	    var k = l[0];
	    var v = decodeURI(l[1]);
            if (l.length === 2 && k in State.DEFAULT) {
	        var t = typeof State.DEFAULT[k];
	        if (t == "boolean") {
                    State.Current[k] = v != "" && v != "0" && v != "false";
	        } else if (t == "number") {
                    State.Current[k] = Number(v);
	        } else {
                    State.Current[k] = v;
	        }
            } else {
                throw "unexpected query: " + value;
            }
        });
    }
    if (State.Current.debug)
        console.log("State: " + JSON.stringify(State.Current));
};

/*
 * return the (minimal) URL representing the current state
 */

State.url = function () {
    var l = window.location;
    var q = [];
    $.each(State.DEFAULT, function (index, _value) {
	if (State.DEFAULT[index] == State.Current[index])
            return;
	var v = State.Current[index];
	if (typeof State.DEFAULT[index] == "boolean")
            v = v ? 1 : 0;
	q.push(index + "=" + v);
    });
    return(l.origin + l.pathname + "?" + q.join("&"));
}
