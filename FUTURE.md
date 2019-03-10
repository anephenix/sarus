Scenario:

- You have created a new WebSocket connection, but some time has passed
  between when the previous WebSocket connection closed and the new WebSocket
  connection was opened. You want to retrieve any messages that might have been
  sent by the server during that time.

Feature:

- Retrieve messages that would have been delivered by the WebSocket server
  during a period of being disconnected (requires using a WebSocket server
  which supports retrieving messages for a client to receive).

Scenario: You want attempts to reconnect to the server to have some form
of exponential backoff.

Feature:

- Introduce an exponential back-off strategy to Sarus in the near future.

Note - there is a `retryConnectionDelay` option - perhaps this could be used to
support the feature by passing a function that implements exponential back-off.
