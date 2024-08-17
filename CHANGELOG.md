# CHANGELOG

### 0.6.0 - Saturday 17th August, 2024

-   Fixed a performance regression relating to the auditEventListeners function (PR#461)
-   Minimize production dependencies by removing current package.json dependencies (PR#424)
=   Added support for Exponential backoff on reconnection attempts (PR#403) 
-   Updated dependencies

### 0.5.0 - Saturday 27th April, 2024

-   Tidied up some missplaced development dependencies
-   Track current connection state internally
-   Made retryConnectionDelay a required parameter, and restricted type to number
-   Cleaned up running commands without using npx
-   Validate URLS when constructing a Sarus instance
-   Updated License, authors and populated contributors
-   Changed node build targets to latest LTS and current (18 & 20)
-   Added Prettier Github Workflow
-   Formatted code using Prettier
-   Updated dependencies

### 0.4.6 - Sunday 18th June, 2023

- Remove string typing on messages sent via WebSocket, to align with TypeScript any type
- Updated dependencies

### 0.4.5 - Sunday 18th June, 2023

- Added support for passing partial event listener events during class instantiation
- Updated dependencies

### 0.4.4 - Tuesday 15th November, 2022

-   Updated dependencies

### 0.4.3 - Sunday 5th September, 2021

-   Updated dependencies

### 0.4.2 - Sunday 6th June, 2021

-   Updated dependencies
-   Added SECURITY.md
-   EventListeners on a closed WebSocket are removed before creating a new
    WebSocket instance upon reconnect.

### 0.4.1 - Monday 1st March, 2021

-   Updated dependencies

### 0.4.0 - Tuesday 13th October, 2020

-   retryConnectionDelay is true by default
-   Updated dependencies

### 0.3.3 - Monday 7th September, 2020

-   Merged PR#19 (ES5 support)
-   Updated dependencies

### 0.3.2 - Saturday 16th May, 2020

-   Added support for defining the binaryType on the WebSocket

### 0.3.1 - Wednesday 25th March, 2020

-   Fixed GitHub issue #14 (Cannot use import statement outside a module)
-   Shipped module is now compiled as a CommonJS module

### 0.3.0 - Friday 6th March, 2020

-   Library has been converted to TypeScript
-   Removed unnecessary checks as TypeScript types capture them

### 0.2.2 - Thursday 10th October, 2019

-   Added support for specifying the protocol to use with the WebSocket connection
-   Updated dependencies

### 0.2.1 - Sunday 17th March, 2019

-   Fixed a bug where messages stored in persistent storage were not being popped
    off of the message queue by new Sarus clients.
-   Added GitHub issue templates
-   Added CONTRIBUTING.md
-   Added CODE_OF_CONDUCT.md
-   Added some missing JSdoc code comments

### 0.2.0 - Friday 15th March, 2019

-   Added a new feature: sarus.disconnect(); Disconnects the WebSocket connection

### 0.1.0 - Sunday 10th March, 2019

-   Added a new feature: retryConnectionDelay
-   Updated documentation

### 0.0.2 - Sunday 3rd March, 2019

-   Refactored the code
-   Updated documentation
-   Added some development tooling to check for code coverage and quality

### 0.0.1 - Sunday 3rd March, 2019

-   Initial version of the library
