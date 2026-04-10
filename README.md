# JSX Renderer

**JSX Renderer** is a native macOS Electron application designed to render React (`.jsx` / `.tsx`) files in real-time, providing pixel-perfect previews and robust export capabilities. It allows you to transform interactive React presentations into high-resolution multi-page PDFs or animated PowerPoint (`.pptx`) files.

## Features

- **Real-Time Preview**: Opens and renders `.jsx`, `.tsx`, `.js`, and `.ts` files with hot-reloading. Changes made in your preferred code editor are automatically reflected in the app.
- **High-Quality PDF Export**: Converts your React-based slide decks into multi-page PDF documents, perfectly capturing the layout and font consistency.
- **PowerPoint (.pptx) Export with Animation**: Generates PowerPoint presentations from your interactive decks. It automatically detects if a slide contains animations:
  - If animated, it captures the slide as a high-quality GIF.
  - If static, it captures a crisp PNG format.
- **Native macOS Experience**: Features a sleek, native macOS design with a customized title bar, traffic light window controls, and a smooth, dark-mode-first aesthetic.

## Tech Stack

- **Electron**: Powers the desktop application and rendering engine.
- **React & ReactDOM**: The core libraries for rendering the user's JSX presentations.
- **Babel**: Transpiles JSX in the browser environment.
- **pdf-lib**: For stitching and assembling high-resolution PDFs.
- **pptxgenjs**: For generating raw `.pptx` presentation files.
- **gif-encoder-2** & **pngjs**: For creating animated GIFs and static PNGs of the slides during the capture process.
- **chokidar**: File system watcher ensuring reliable real-time updates.

## Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. Clone or download the repository:
   ```bash
   git clone <repository-url>
   cd jsx-renderer
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally

To start the application in development mode (which automatically opens Chrome DevTools):
```bash
npm run dev
```

To run the application normally:
```bash
npm start
```

### Building for macOS

To package the app into a macOS executable (`.dmg` and `.zip`):
```bash
npm run build
```
Once complete, the built app can be found in the `dist/` directory.

## Usage

1. Launch **JSX Renderer**.
2. Go to **File > Open File...** (or press `Cmd+O`) and select your React component or presentation file.
3. The app will render your component. If your component is a presentation, you can navigate through the slides using arrow keys.
4. To export, use the **File** menu or keyboard shortcuts to export as **PDF** or **PPTX**. The app will automatically progress through the slides and capture them sequentially.

## License

This project is licensed under the MIT License.
