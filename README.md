# Sarus

A WebSocket JavaScript library.

[![npm version](https://badge.fury.io/js/%40anephenix%2Fsarus.svg)](https://badge.fury.io/js/%40anephenix%2Fsarus) ![example workflow](https://github.com/anephenix/sarus/actions/workflows/node.js.yml/badge.svg) [![Maintainability](https://api.codeclimate.com/v1/badges/0671cfc9630a97854b30/maintainability)](https://codeclimate.com/github/anephenix/sarus/maintainability) [![Test Coverage](https://api.codeclimate.com/v1/badges/0671cfc9630a97854b30/test_coverage)](https://codeclimate.com/github/anephenix/sarus/test_coverage)

### Features

-   Automatically reconnects WebSocket connections when they are severed
-   Handles rebinding eventListener functions to new WebSocket connections created to replace closed connections
-   Uses a message queue to dispatch messages over the WebSocket connection, which means:
    -   Messages don't get lost if the WebSocket connection is not open
    -   Message sending gets retried if the WebSocket connection is not open
    -   Messages can be persisted in browser storage, so that they remain even after webpage refreshes.

### Install

```
npm i @anephenix/sarus
```

### Usage

After installing Sarus, you can use the client library with your frontend
codebase:

```javascript
import Sarus from '@anephenix/sarus';

const sarus = new Sarus({
	url: 'wss://ws.anephenix.com',
});
```

Sarus creates a WebSocket connection to the url. You can then attach event
listener functions to that WebSocket client via `sarus` for events like:

-   When the socket receives a message
-   When an error occurs on the socket
-   When the socket is closed
-   When a new socket is opened

Here's an example of attaching events on client initialization:

```javascript
// Log a message that the connection is open
const noteOpened = () => console.log('Connection opened');

// Assuming that the WebSocket server is sending JSON data,
// you can use this to parse the data payload;
const parseMessage = (event) => {
	const message = JSON.parse(event.data);
	// Then do what you like with the message
};

// Log a message that the connection has closed
const noteClosed = () => console.log('Connection closed');

// If an error occurs, throw the error
const throwError = (error) => throw error;

// Create the Sarus instance with the event listeners
const sarus = new Sarus({
	url: 'wss://ws.anephenix.com',
	eventListeners: {
		open: [noteOpened],
		message: [parseMessage],
		close: [noteClosed],
		error: [throwError],
	},
});
```

You can specify all of the event listeners at initialisation, or just one of them:

```javascript

// Assuming that the WebSocket server is sending JSON data,
// you can use this to parse the data payload;
const parseMessage = (event) => {
	const message = JSON.parse(event.data);
	// Then do what you like with the message
};


// Create the Sarus instance with the event listeners
const sarus = new Sarus({
	url: 'wss://ws.anephenix.com',
	eventListeners: {
		message: [parseMessage],
	},
});
```

You can also add eventListeners after client initialization:

```javascript
/*
    A function that stores messages in the browser's LocalStorage, possibly 
    for debugging, or for event stream processing on the client side.
*/
const storeMessage = (event) => {
	const store = window.localStorage;
	let record = store.getItem('messages');
	if (!record) {
		record = [];
	} else {
		record = JSON.parse(record);
	}
	record.push(event.data);
	store.setItem('messages', JSON.stringify(record));
};

// Attach the storeMessage function to Sarus when it receives a message from
// the WebSocket server
sarus.on('message', storeMessage);
```

You can also use it to send messages to the WebSocket server:

```javascript
sarus.send('Hello world');
```

#### Automatic WebSocket reconnection

WebSockets can close unexpectedly. When a WebSocket instance is closed, it
cannot be reopened. To re-establish a WebSocket connection, you have to create
a new `WebSocket` instance to replace the closed instance.

Usually you would handle this by writing some JavaScript to wrap the WebSocket
interface, and trigger opening a new WebSocket connection upon a close event
occurring.

Sarus will do this automatically for you.

It does this by attaching a `connect` function on the `close` event happening
on the `WebSocket` instance. If the `WebSocket` instance closes, the `connect`
function will simply create a new `WebSocket` instance with the same
parameters that were passed to the previous instance.

The `connect` function is called immediately by default, and it will repeat
this until it gets a `WebSocket` instance whose connection is open.

If you do not want the WebSocket to reconnect automatically, you can pass the
`reconnectAutomatically` parameter into the sarus client at the point of
initializing the client, like the example below.

```javascript
const sarus = new Sarus({
	url: 'wss://ws.anephenix.com',
	reconnectAutomatically: false,
});
```

#### Disconnecting a WebSocket connection

There may be a case where you wish to close a WebSocket connection (such as
when logging out of a service). Sarus provides a way to do that:

```javascript
sarus.disconnect();
```

Calling that function on the sarus client will do 2 things:

1. Set the `reconnectAutomatically` flag to false.
2. Close the WebSocket connection.

Event listeners listening on the WebSocket's close event will still trigger,
but the client will not attempt to reconnect automatically.

If you wish to close the WebSocket but not override the `reconnectAutomatically` flag, pass this:

```javascript
sarus.disconnect(true);
```

The client will attempt to reconnect automatically.

#### Delaying WebSocket reconnection attempts

When a connection is severed and the sarus client tries to reconnect
automatically, it will do so with a delay of 1000ms (1 second).

If you pass a number, then it will delay the reconnection attempt by that time
(in miliseconds):

```javascript
const sarus = new Sarus({
	url: 'wss://ws.anephenix.com',
	retryConnectionDelay: 500, // equivalent to 500ms or 1/2 second
});
```

** NOTE **

In the past this option needed to be explicitly passed, but we decided to
change it to be enabled by default. Without it, any disconnection could result
in thousands of attempted reconnections by one client in the space of a few
seconds.

#### Attaching and removing event listeners

When a WebSocket connection is closed, any functions attached to events emitted
by that WebSocket instance need to be attached to the new WebSocket instance.
This means that you end up writing some JavaScript that handles attaching event
listener functions to new WebSocket instances when they get created to replace
closed instances.

Sarus does this for you. You have 2 ways to attach functions to your WebSocket
event listeners - either when creating the Sarus instance, or after it exists:

```javascript
// Log a message that the connection is open
const noteOpened = () => console.log('Connection opened');

// Assuming that the WebSocket server is sending JSON data,
// you can use this to parse the data payload;
const parseMessage = (event) => {
	const message = JSON.parse(event.data);
	// Then do what you like with the message
};

// Log a message that the connection has closed
const noteClosed = () => console.log('Connection closed');

// If an error occurs, throw the error
const throwError = (error) => throw error;

// Create the Sarus instance with the event listeners
const sarus = new Sarus({
	url: 'wss://ws.anephenix.com',
	eventListeners: {
		open: [noteOpened],
		message: [parseMessage],
		close: [notedClosed],
		error: [throwError],
	},
});
```

In this example, those functions will be bound to the WebSocket instance. If
the WebSocket instance's connection closes, a new WebSocket instance is
created by Sarus to reconnect automatically. The event listeners set in Sarus
will be attached to that new WebSocket instance automatically.

That is one way that Sarus allows you to bind event listeners to events on the
WebSocket connection. Another way to do it is to call the `on` function on the
Sarus instance, like this:

```javascript
/*
    A function that stores messages in the browser's LocalStorage, possibly 
    for debugging, or for event stream processing on the client side.
*/
const storeMessage = (event) => {
	const store = window.localStorage;
	let record = store.getItem('messages');
	if (!record) {
		record = [];
	} else {
		record = JSON.parse(record);
	}
	record.push(event.data);
	store.setItem('messages', JSON.stringify(record));
};

// Attach the storeMessage function to Sarus when it receives a message from
// the WebSocket server
sarus.on('message', storeMessage);
```

If you want to remove a function from a WebSocket event listener, you can do
that by calling the `off` function on Sarus like this:

```javascript
// Pass the function variable
sarus.off('message', storeMessage);

// You can also pass the name of the function as well
sarus.off('message', 'storeMessage');
```

If you attempt to remove an event listener function which is not in the list of
event listeners, then an error will be thrown by Sarus. This is a deliberate
behaviour of Sarus. Rather than silently failing to remove a function because
it was not there (or perhaps there was a misspelling of the function name), it
will explicitly throw an error, so that the developer can be made aware of it
and handle it as they wish.

If the developer is happy for an event listener removal to fail without
throwing an error, they can pass this to the `off` function:

```javascript
sarus.off('message', 'myNonExistentFunction', { doNotThrowError: true });
```

#### Queuing messages for delivery when the WebSocket connection is severed

Sending a message from a Websocket client to the server depends on the
WebSocket connection being open. If the connection is closed, then you will
need to either prevent the messages from being sent (block message delivery),
or you will need to queue the messages for delivery (queue message delivery).
Either option requires writing some JavaScript to do that.

To handle this case, Sarus implements a client-based message queue, so that
messages are sent only when there is an open WebSocket connection.

The message queue is stored in memory. If the web page is refreshed, then the
messages in the queue will be lost. If you want to persist the messages in the
queue between web page refreshes, you can pass an option to Sarus to have the
messages stored using the [sessionStorage protocol](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage):

```javascript
const sarus = new Sarus({
	url: 'wss://ws.anephenix.com',
	storageType: 'session',
});
```

The sessionStorage protocol guarantees that messages are stored between
web page refreshes, but only in the context of that web page's browser tab or
window. The messages will not persist in new browser tabs/windows, or after the
browser has been closed.

If you want the storage of those messages to persist beyond web page sessions,
then you can use the [localStorage protocol](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) as the storage mechanism:

```javascript
const sarus = new Sarus({
	url: 'wss://ws.anephenix.com',
	storageType: 'local',
});
```

LocalStorage guarantees that the messages are persisted beyond browsers being
closed and reopened, as well as when the page is opened in a new tab/window.

**NOTE** When persisting messages, be careful that the messages are safe to
persist in browser storage, and do not contain sensitive information. If you
want messages to be wiped when the user closes the browser, use 'session' as
the storage type.

**NOTE** Each web browser implements arbitrary limits for how much data can be
stored in sessionStorage/localStorage for a domain. When that limit is reached,
the web browser will throw a QUOTA_EXCEEDED_ERR error. The limits tend to be in
the 5MB-10MB range, but do vary between browsers.

If you think that there is a potential case for you ending up queuing at least
5MB of data in messages to send to a WebSocket server, then you may want to
wrap `sarus.send` function calls in a try/catch statement, so as to handle
those messages, should they occur.

### Advanced options

Sarus has a number of other options that you can pass to the client during
initialization. They are listed in the example below:

```javascript
const sarus = new Sarus({
	url: 'wss.anephenix.com',
	protocols: 'hybi-00',
	retryProcessTimePeriod: 25,
	storageKey: 'messageQueue',
});
```

The `protocols` property is used to specify the sub-protocol that the WebSocket
connection should use. You can pass either a string, or an array of strings.

The `retryProcessTimePeriod` property is used to help buffer the time between
trying to resend a message over a WebSocket connection. By default it is a
number, 50 (for 50 miliseconds). You can adjust this value in the client
instance.

The `storageKey` property is a key that is used with sessionStorage and
localStorage to store and retrieve the messages in the message queue. By
default it is set to 'sarus'. You can set this to another string value if
you wish. You can also inspect the message queue independently of Sarus by
making calls to the sessionStorage/localStorage api with that key.

### Using the library in your frontend code with babel, webpack, rollup, etc.

The code for the library is written using ES2015 features, and the idea is that
developers can directly load that code into their application, rather than
loading it as an external dependency in a transpiled and minified format.

This gives the developer the freedom to use it as they wish with the frontend
tools that they use, be it Babel, WebPack, Rollup, or even Browserify.

### Developing locally and running tests

```
npm t
```

This will run tests using jest and with code coverage enabled.

### License and Credits

&copy; 2020 Anephenix OÜ. Sarus is licensed under the MIT License.
