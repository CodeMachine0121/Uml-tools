# UML Drawing Platform

A web-based platform for creating UML diagrams with Mermaid export/import capabilities.

## Features

- Draw UML class and interface diagrams
- Create relationships between elements (inheritance, implementation, dependency, association)
- Add text annotations
- Export diagrams to Mermaid format
- Import diagrams from Mermaid format

## Architecture

This project follows Clean Architecture principles:

- **Domain Layer**: Contains the core business logic and entities
- **Application Layer**: Contains use cases and services
- **Infrastructure Layer**: Contains repositories and external services
- **Presentation Layer**: Contains the UI components

## Tech Stack

- **Runtime**: [Bun](https://bun.sh) - A fast all-in-one JavaScript runtime
- **Framework**: [Svelte](https://svelte.dev) - A reactive UI framework
- **Diagram Syntax**: [Mermaid](https://mermaid-js.github.io/mermaid/) - A diagramming and charting tool

## Development

### Prerequisites

- [Bun](https://bun.sh) v1.2.17 or later

### Installation

```bash
# Install dependencies
bun install
```

### Running the Development Server

```bash
# Start the development server
bun run dev
```

### Building for Production

```bash
# Build the application
bun run build
```

### Preview Production Build

```bash
# Preview the production build
bun run preview
```

## Usage

1. Select a tool from the toolbox on the left
2. Click and drag on the canvas to create elements
3. Connect elements by selecting a relationship arrow and clicking on source and target elements
4. Double-click anywhere on the canvas to add text
5. Double-click on an element to edit its text
6. Click "Export to Mermaid" to generate Mermaid code
7. Use the import feature to create a diagram from Mermaid code
