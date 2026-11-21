### Background

WebSockets are great, but using them in real-world applications requires
handling cases where:

- The WebSocket connection can close unexpectedly, such as when losing
  Internet access for a brief period of time.

- You want to send messages to the WebSocket connection, but if the connection
  is closed then the messages will not be received by the server.

- The messages that would be sent from the client to the server get lost when
  the user refreshes the page in the browser.

To handle these cases, you will have to write some JavaScript that essentially
wraps access to the WebSocket protocol and handles those cases.

Sarus is a library designed to do exactly that. It has the following features:

- Handle reconnecting a WebSocket connection if it closes unexpectedly.

- Make sure event listeners that were attached to the origin WebSocket instance
  are attached to subsequent WebSocket instances.

- Record messages to deliver if the WebSocket connection is closed, and deliver
  them once there is an open WebSocket connection.
