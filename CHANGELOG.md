# CHANGELOG

### 0.6.6 - Monday 28th October, 2024

- Merge pull request #481 from anephenix/dependabot/npm_and_yarn/babel/types-7.26.0
- Merge pull request #480 from anephenix/dependabot/npm_and_yarn/babel/parser-7.26.1
- Merge pull request #478 from anephenix/dependabot/npm_and_yarn/types/jest-29.5.14
- Merge pull request #476 from anephenix/dependabot/npm_and_yarn/jsdoc-4.0.4
- Bump @babel/types from 7.25.8 to 7.26.0
- Bump @babel/parser from 7.25.8 to 7.26.1
- Bump @types/jest from 29.5.13 to 29.5.14
- Bump jsdoc from 4.0.3 to 4.0.4

### 0.6.5 - Monday 14th October, 2024

- Merge pull request #475 from anephenix/dependabot/npm_and_yarn/babel/parser-7.25.8
- Merge pull request #474 from anephenix/dependabot/npm_and_yarn/babel/types-7.25.8
- Bump @babel/parser from 7.25.7 to 7.25.8
- Bump @babel/types from 7.25.7 to 7.25.8

### 0.6.4 - Wednesday 9th October, 2024

- Merge pull request #473 from anephenix/dependabot/npm_and_yarn/typescript-5.6.3
- Bump typescript from 5.6.2 to 5.6.3
- Merge pull request #472 from anephenix/dependabot/npm_and_yarn/babel/parser-7.25.7
- Merge pull request #471 from anephenix/dependabot/npm_and_yarn/babel/types-7.25.7
- Bump @babel/parser from 7.25.6 to 7.25.7
- Bump @babel/types from 7.25.6 to 7.25.7

### 0.6.3 - Monday 30th September, 2024

- Added more scripts for automation
- Updated the push script to trigger automatically on pushing tags

### 0.6.2 - Monday 30th September, 2024

- Tweaks to the prepare-patch-release command
- Use a script to prepare the patch release
- A workaround for the GitHub action to fetch tags
- Running publish will update the changelog automatically
- Small tweak to the changelog script
- Added a script to generate updates for the changelog
- Updated Changelog

### 0.6.1 - Friday 27th September, 2024

- Dependency updates

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
