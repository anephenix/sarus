# Sarus

A WebSocket JavaScript library.

### Background

WebSockets are great, but using them in real-world applications requires
handling cases where:

- The WebSocket connection can close unexpectedly, such as when losing
  Internet access for a brief period of time.

- You want to send messages to the WebSocket connection, but if the connection
  is closed then the messages will not be received by the server.

- The messages that would be sent from the client to the server get lost on a
  when the user refreshes the page in the browser.

To handle these cases, you will have to write some JavaScript that essentially
wraps access to the WebSocket protocol and handles those cases.

Sarus is a library designed to do exactly that. It has the following features:

- Handle reconnecting a WebSocket connection if it closes unexpectedly.

- Make sure event listeners that were attached to the origin WebSocket instance
  are attached to subsequent WebSocket instances.

- Record messages to deliver if the WebSocket connection is closed, and deliver
  them once there is an open WebSocket connection.

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
  url: 'wss://ws.anephenix.com'
});
```

Sarus creates a WebSocket connection to the url. You can then attach event
listener functions to the `sarus` variable for events like:

- When the socket receives a message
- When an error occurs on the socket
- When the socket is closed
- When a new socket is opened

We will show you how to attach and remove event listeners later on in the
documentation.

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

The `connect` function is called immediately, and it will repeat this until it
gets a `WebSocket` instance whose connection is open. The benefit of this is
that there is no delay in re-establishing a WebSocket connection. The drawback
is that it can end up submitting a lot of requests to re-establish a WebSocket
conection, if say the WebSocket server is down for a few seconds.

In the case that you wish to implement your own reconnection strategy with say
some exponential back-off applied (a time delay between reconnection attempts),
you can disable the automatic reconnection strategy. You can do that by passing
the `reconnectAutomatically` parameter to the `Sarus` class instance:

There will be a plan to introduce an exponential back-off strategy to Sarus in
the near future.

```javascript
const sarus = new Sarus({
  url: 'wss://ws.anephenix.com',
  reconnectAutomatically: false
});
```

You can then write a function and attach it to the `sarus` instance on the
`close` event in the eventListeners parameter.

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
const parseMessage = event => {
  const message = JSON.parse(event.data);
  // Then do what you like with the message
};

// Log a message that the connection has closed
const noteClosed = () => console.log('Connection closed');

// If an error occurs, throw the error
const throwError = error => throw error;

// Create the Sarus instance with the event listeners
const sarus = new Sarus({
  url: 'wss://ws.anephenix.com',
  eventListeners: {
    open: [noteOpened],
    message: [parseMessage],
    close: [notedClosed],
    error: [throwError]
  }
});
```

In this example, those functions will be bound to the WebSocket instance. If
the WebSocket instance's connection closes, a new WebSocket instance is
created by Sarus to reconnect automatically. The event listeners set in Sarus
will be attached to that new WebSocket instance.

That is one way that Sarus allows you to bind event listeners to events on the
WebSocket connection. Another way to do it is to call the `on` function on the
Sarus instance, like this:

```javascript
/*
    A function that stores messages in the browser's LocalStorage, possibly 
    for debugging, or for event stream processing on the client side.
*/
const storeMessage = event => {
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

Sending a message from the client to the server depends on the WebSocket
connection being open. If the connection is closed, then you will need to
either prevent the messages from being sent (block message delivery), or
you will need to queue the messages for delivery (queue message delivery).
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
  storageType: 'session'
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
  storageType: 'local'
});
```

LocalStorage guarantees that the messages are persisted beyond browsers being
closed and reopened, as well as when the page is opened in a new tab/window.

**NOTE** When persisting messages, be careful that the messages are safe to
persist in browser storage, and do not contain sensitive information. If you
want messages to be wiped when the user closes the browser, use 'session' as
the storage type.

### Advanced options

Sarus has a number of other options that you can pass to the client during
initialization. They are listed in the example below:

```javascript
const sarus = new Sarus({
  url: 'wss.anephenix.com',
  retryProcessTimePeriod: 25,
  storageKey: 'messageQueue'
});
```

The `retryProcessTimePeriod` property is used to help buffer the time between
trying to resend a message over a WebSocket connection. By default it is a
number, 50 (for 50 miliseconds). You can adjust this value in the client
instance.

The `storageKey` property is a key that is used with sessionStorage and
localStorage to store and retrieve the messages in the message queue.

### Developing locally and running tests

```
npm t
```

This will run tests with jest with code coverage output.

### License and Credits

&copy; 2019 Anephenix OÜ. Sarus is licensed under the MIT License.
