
// turtle.js
//
// sample client program that connects to NetLogo 5.0.1 and moves a turtle around
//
// Charlie Turner
// cjturner@ucdavis.edu
// UC Davis, 7-12-12

// Default values 
var DEFAULT_NETLOGO_USER = "";
var DEFAULT_NETLOGO_IP_ADDRESS = "10.0.1.2";  //"169.237.97.12";
var DEFAULT_NETLOGO_XCOR = "0";
var DEFAULT_NETLOGO_YCOR = "0";

/*************************************************************************
 * 
 *	Initialization Functions - called from $(document).ready in index.html
 *
 *************************************************************************/

function initialize_turtles() {

	// call init functions for three basic areas: 
	// session data, netlogo websocket library, & the display
	initialize_session_data();
	initialize_netlogo();
	initialize_display();
}

function initialize_netlogo() {

	/****************  User configurable settings *******************/

	NETLOGO.set_port(9999);					// 9999 is current default - but this is how you would override			
	NETLOGO.set_timeout(2000);				// set connect timeout to 2 seconds instead of default 5 secs

	/****************  NETLOGO  message  tags  **********************/

	// establish "handlers" for all tags sent by NetLogo server
	// in this case, we establish a handler for "location" messages
	// when a "location" message is received, the function hand_location_messages will be called
	NETLOGO.set_handler("location", handle_location_message);

	// here a more generic handler is established for anything other than "location" messages
	NETLOGO.set_handler("default", handle_unrecognized_message);

	// you can look at the installed handlers at any time:
	// alert("Installed NetLogo Handlers: " + NETLOGO.show_handlers());

	/****************  ERROR  handlers  **********************/

	// establish handlers for errors - this is optional
	// if you establish no error handlers, alert(<message>) will be called.
	// set_errorhandler returns true on success, false otherwise
	// here we set a handler for just the "netlogo-exit" error/event
	if (!NETLOGO.set_errorhandler("netlogo-exit", turtle_handle_netlogo_exit)) {
		alert("Something went wrong with my NETLOGO.set_errorhandler call!");
	}

	// here we set a handler for just the "netlogo-version" error/event
	if (!NETLOGO.set_errorhandler("netlogo-version", turtle_handle_netlogo_version_mismatch)) {
		alert("Something went wrong with my NETLOGO.set_errorhandler call!");
	}

	// here we establish a more generic handler for anything else that happens
	NETLOGO.set_errorhandler("default", turtle_default_error_handler);

	//	you can get the list of all currently assigned error handlers by uncommenting:
	// alert("Installed error handlers: " + NETLOGO.show_errorhandlers());

	debug("initialize_netlogo: completed");
}

/*************************************************************************
 * 
 *	Error Handlers
 *
 *************************************************************************/

function turtle_handle_netlogo_exit(msg) {
	alert("turtle_handle_netlogo_exit: " + msg);

	// reset the Connect/Leave button to reflect the fact that we are no longer connected
	$("#gnetlogo .ui-btn-text").text("Connect to NetLogo");
}

// This is a classic problem when people upgrade to a new version of NetLogo
function turtle_handle_netlogo_version_mismatch(msg) {
	alert("turtle_handle_netlogo_version_mismatch: " + msg);

	// reset the Connect/Leave button to reflect the fact that we are no longer connected
	$("#gnetlogo .ui-btn-text").text("Connect to NetLogo");
}


function turtle_default_error_handler(msg) {
	alert("turtle_default_error_handler: " + msg);

	// reset the Connect/Leave button to reflect the fact that we are no longer connected
	// (given that this is the default handler, this could be an incorrect assumption - but probably true)
	$("#gnetlogo .ui-btn-text").text("Connect to NetLogo");

}


/*************************************************************************
 * 
 *	Message Handling Functions
 *
 *************************************************************************/

// handle_location_message: parse a "location" message and update display 
//		using the id tag "#netlogo_location" on the HTML element
//		Note: this function isn't taking the LogoList apart, just treating it as a string
	
function handle_location_message(fields) {
    var content_type, content_value;
	console.log("turtle handle_location: fields = " + JSON.stringify(fields));
    content_type = fields.content.type;
    content_value = fields.content.value;

    if (content_type === "String") {
        $("#netlogo_location").text(content_value);

        debug("setting netlogo_location to " + content_value);
    } else {
		alert("handle_location_message: unexpected content_type: " + content_type);
    }
}

// handle everything else with an alert
function handle_unrecognized_message(stuff) {
	alert("handle_unrecognized_message: got stuff = " + JSON.stringify(stuff));
}

/*************************************************************************
 * 
 *	Display-oriented functions
 *
 *************************************************************************/

// initialize_display: function that sets up various JQuery handlers.
//		this function called once from main initialize_turtles function.
		
function initialize_display() {

	$("#setup_netlogo_form").bind("submit", function (event, ui) {
		store_netlogo_setup();
		return true;		// must return true to close dialog box.
	});

	$("#setup").on("pagebeforeshow", function (event) {
		init_setup_from_session();
	});

	$("#move_turtle").on("pagebeforeshow", function (event) {
		var x1, y1;
		x1 = sessionStorage.getItem("x1");
		y1 = sessionStorage.getItem("y1");

		$("#local_location").text("(" + x1 + "," + y1 + ")");
		$("#netlogo_location").text("(?, ?)");
	});

	debug("initialize_display: completed");
}


// init_setup_from_session: update setup form from persistent values stored in sessionStorage

function init_setup_from_session() {
	var username, serveraddr;

	username = sessionStorage.getItem("username");
	serveraddr = sessionStorage.getItem("serveraddr");

	if (username && username !== "") {
		$("#username").val(username);
	}

	if (serveraddr && serveraddr !== "") {
		$("#serveraddr").val(serveraddr);
	}
}

// movePoint("dir"): called with one of the four directions 
//    depending on which mouse button was pressed:  up, down, left, right
// 

function movePoint(direction) {
	var my_xcor, my_ycor;

	/* updated the display */
	debug("in movePoint: " + direction);
	jsxMovePoint(direction);
	
	my_xcor = getItemTyped("x1", "number");
	my_ycor = getItemTyped("y1", "number");

	switch (direction) {
	case "up":
		my_ycor += 1;
		sessionStorage.setItem("y1", my_ycor);
		break;
	case "down":
		my_ycor -= 1;
		sessionStorage.setItem("y1", my_ycor);
		break;
	case "left":
		my_xcor -= 1;
		sessionStorage.setItem("x1", my_xcor);
		break;
	case "right":
		my_xcor += 1;
		sessionStorage.setItem("x1", my_xcor);
		break;
	default:
		nl_alert("Unrecognized direction in movePoint: " + direction);
	}

	// attempt to send point to NetLogo 
	NETLOGO.send_command(direction, "Boolean", false);
}

var isvisible = true;
function toggle_visible() {
	isvisible = !isvisible;
	points[0].setProperty({visible:isvisible});
}

var colors = ['#FF0000', '#00FF00', '#0000FF'];
var coloridx = 0;
function toggle_color() {
	coloridx = (coloridx + 1) % colors.length;
	
	points[0].setProperty({fillColor:colors[coloridx]});
	points[0].setProperty({strokeColor:colors[coloridx]});
}



function jsxMovePoint(dir){
	debug("in jsxMovePoint: " + dir);
	if (points === undefined) {
		alert("jsxMovePoint: points is not defined!");
	} else {
		switch(dir){
			case 'up':
				points[0].setPosition(JXG.COORDS_BY_USER, [points[0].X(),points[0].Y()+1]);
				break;
			case 'down':
				points[0].setPosition(JXG.COORDS_BY_USER, [points[0].X(),points[0].Y()-1]);
				break;
			case 'left':
				points[0].setPosition(JXG.COORDS_BY_USER, [points[0].X()-1,points[0].Y()]);
				break;
			case 'right':
				points[0].setPosition(JXG.COORDS_BY_USER, [points[0].X()+1,points[0].Y()]);
				break;
			default:
				break;
		}
		board.update(); 
		$("#local_location").text("(" + points[0].X() + "," +points[0].Y() + ")");
	}
}


function toggle_netlogo() {
	var serveraddr, username, resp;

	if (NETLOGO.connection_state() === "OPEN") {
		resp = confirm("Are you sure you want to leave the group?");
		if (resp === true) {

			NETLOGO.disconnect();

			// do some fancy UI adjustments
			$("#gnetlogo .ui-btn-text").text("Connect to NetLogo");
		}

	} else {
		if (!setup_completep()) {
			alert("You can't join until you have completed Setup. Use the Back arrow to get to Setup.");
		} else {
			serveraddr = sessionStorage.getItem("serveraddr");
			username = sessionStorage.getItem("username");
			
			// two ways to call connect
			// 1) with just server address and username
			// NETLOGO.connect(serveraddr, username);
			
			// 2) with an optional third argument - a function to be called
			//		when the NETLOGO startup protocol completes
			//NETLOGO.connect(serveraddr, username, turtle_login_sequence_completed);

			// you can also use an anonymous function
			NETLOGO.connect(serveraddr, username, function () { alert("Login complete for " + username);});

			// do some fancy UI adjustments
			$("#gnetlogo .ui-btn-text").text("Leave NetLogo");
		}
	}
	return true;
}

// stub function for callback that is activated after startup protocol completes

function turtle_login_sequence_completed () {
	alert("turtle_login_sequence_completed function called!");
}



/*************************************************************************
 * 
 *	Session Storage - persistent storage for user settable variables
 *
 *************************************************************************/

function initialize_session_data() {
	sessionStorage.clear();

	sessionStorage.setItem("username", DEFAULT_NETLOGO_USER);
	sessionStorage.setItem("serveraddr", DEFAULT_NETLOGO_IP_ADDRESS);
	sessionStorage.setItem("x1", DEFAULT_NETLOGO_XCOR);
	sessionStorage.setItem("y1", DEFAULT_NETLOGO_YCOR);

	sessionStorage.setItem("setup_completep", "false");
	debug("initialize_session_data: completed");
}


function store_netlogo_setup() {
	var user_initials, username, serveraddr, setup_completep;
	username = $("#username").val();
	serveraddr = $("#serveraddr").val();
	
	// start off assuming setup_completep will be true.   Any of the tests below can reset to false
	setup_completep = true;

	debug("store_netlogo_setup: called with name = " + username);

	if (username && (username !== "")) {
		user_initials = username.substring(0, 3);
		username = username.trim();
		sessionStorage.setItem("username", user_initials);

	} else {
		debug("store_netlogo_setup: failed to store valid username.");
		setup_completep = false;
	}

	if (serveraddr && (serveraddr !== "")) {
		sessionStorage.setItem("serveraddr", serveraddr.trim());
	} else {
		debug("store_netlogo_setup: failed to store valid server address.");
		setup_completep = false;
	}

	if (setup_completep) {
		debug("store_netlogo_setup: user name & server ip SUCCESSFULLY stored in session. setup_completep = TRUE");
	} else {
		debug("store_netlogo_setup: one of setup variables still unset. setup_completep = FALSE");
	}

	sessionStorage.setItem("setup_completep", setup_completep);
	return setup_completep;
}


function setup_completep() {
	var rval, x;
	rval = false;
	x = sessionStorage.getItem("setup_completep");
	if (x && (x.toLowerCase() === "true")) {
		rval = true;
	}
	return rval;
}


function getItemTyped(name, type) {
	var tval, rval;
	tval = sessionStorage.getItem(name);

	rval = null;
	if (tval && tval !== "") {
		if (type === "number") {
			rval = Number(tval);
		} else if (type === "boolean") {
			rval = Boolean(tval);
		} else if (type === "string") {
			rval = String(tval);
		} else {
			alert("getItemTyped - unrecognized type - " + type);
			rval = null;
		}
	} else {
		alert("getItemTyped: variable is not defined - " + name);
		rval =  null;
	}
	return rval;
}



/************************************************************
 * 
 *	Debugging Tools
 *
 ************************************************************/

function debug(str) {
	if (typeof console === "object") {
		console.log(str);
	}
}

