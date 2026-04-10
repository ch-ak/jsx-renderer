const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const chokidar = require('chokidar');
const PptxGenJS = require('pptxgenjs');
const GIFEncoder = require('gif-encoder-2');
const { PNG } = require('pngjs');
const { PDFDocument } = require('pdf-lib');

let mainWindow;
let watchers = new Map();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 18 },
    backgroundColor: '#0f1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      webSecurity: false,
    },
    icon: process.platform === 'darwin' ? undefined : path.join(__dirname, 'assets', 'icon.png'),
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Open DevTools in dev mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Handle drag-and-drop files from OS
  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });
}

// ── IPC: Open file dialog ────────────────────────────────────────────────────
ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Open JSX File',
    filters: [
      { name: 'React / JSX Files', extensions: ['jsx', 'js', 'tsx', 'ts'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile', 'multiSelections'],
  });
  if (canceled) return null;
  return filePaths;
});

// ── IPC: Read file content ───────────────────────────────────────────────────
ipcMain.handle('file:read', async (_event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── IPC: Watch file for changes ──────────────────────────────────────────────
ipcMain.handle('file:watch', async (_event, filePath) => {
  // Stop any existing watcher for this file
  if (watchers.has(filePath)) {
    watchers.get(filePath).close();
    watchers.delete(filePath);
  }

  const watcher = chokidar.watch(filePath, { persistent: true, usePolling: false });
  watcher.on('change', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        mainWindow.webContents.send('file:changed', { path: filePath, content });
      } catch (err) {
        mainWindow.webContents.send('file:changed', { path: filePath, error: err.message });
      }
    }
  });
  watchers.set(filePath, watcher);
  return { success: true };
});

// ── IPC: Stop watching a file ────────────────────────────────────────────────
ipcMain.handle('file:unwatch', async (_event, filePath) => {
  if (watchers.has(filePath)) {
    watchers.get(filePath).close();
    watchers.delete(filePath);
  }
  return { success: true };
});

// ── IPC: Export current view to PDF ─────────────────────────────────────────
ipcMain.handle('pdf:export', async (_event, options) => {
  const { defaultName } = options || {};

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export as PDF',
    defaultPath: defaultName ? `${defaultName}.pdf` : 'component.pdf',
    filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
  });

  if (canceled || !filePath) return { success: false, canceled: true };

  try {
    // Find the webview in the page and print it
    const views = mainWindow.webContents.getAllWebContents
      ? mainWindow.webContents.getAllWebContents()
      : [];

    // We'll use the main window's webContents to execute JS in the preview iframe
    // Instead, we capture via IPC relay — the renderer sends us the preview webContents id
    const pdfData = await mainWindow.webContents.printToPDF({
      printBackground: true,
      margins: { marginType: 'none' },
      pageSize: 'A4',
      landscape: false,
    });

    fs.writeFileSync(filePath, pdfData);
    shell.showItemInFolder(filePath);
    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── IPC: Export preview webview to PDF ──────────────────────────────────────
ipcMain.handle('pdf:exportWebview', async (_event, options) => {
  const { defaultName, webContentsId } = options || {};

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export as PDF',
    defaultPath: defaultName ? `${defaultName}.pdf` : 'component.pdf',
    filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
  });

  if (canceled || !filePath) return { success: false, canceled: true };

  try {
    const { webContents } = require('electron');
    const wc = webContents.fromId(webContentsId);
    if (!wc) throw new Error('Preview webview not found');

    const mergedPdf = await PDFDocument.create();

    const MAX_SLIDES = 100;
    let lastSlideFirstFrameHash = null;

    // Wait slightly to make sure the webview is settled
    await new Promise(r => setTimeout(r, 500));

    for (let slideIndex = 0; slideIndex < MAX_SLIDES; slideIndex++) {
      mainWindow.webContents.send('status', `Exporting slide ${slideIndex + 1} to PDF...`);

      // Check if slide changed
      let firstFrameImg = await wc.capturePage();
      const sz = firstFrameImg.getSize();
      const scale = Math.min(800 / sz.width, 1);
      const targetW = Math.round(sz.width * scale);
      const targetH = Math.round(sz.height * scale);
      
      let firstFrameResized = firstFrameImg.resize({ width: targetW, height: targetH });
      const firstPng = PNG.sync.read(firstFrameResized.toPNG());
      let frameHash = 0;
      for (let i = 0; i < firstPng.data.length; i += 100) frameHash += firstPng.data[i];
      
      if (lastSlideFirstFrameHash === frameHash && slideIndex > 0) {
        break; // Reached the end (or not a deck, so no change)
      }
      lastSlideFirstFrameHash = frameHash;

      const pdfData = await wc.printToPDF({
        printBackground: true,
        margins: { marginType: 'none' }, // Perfect for slides
        pageSize: 'A4',
        landscape: true, // Slides are usually wide
      });

      const slidePdfDoc = await PDFDocument.load(pdfData);
      const copiedPages = await mergedPdf.copyPages(slidePdfDoc, [0]);
      copiedPages.forEach((page) => mergedPdf.addPage(page));

      // Advance
      await wc.executeJavaScript(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));`);
      
      // Wait for transition before capturing next slide PDF
      await new Promise(r => setTimeout(r, 400));
    }

    mainWindow.webContents.send('status', `Saving PDF file to disk...`);
    const pdfBytes = await mergedPdf.save();
    fs.writeFileSync(filePath, pdfBytes);

    shell.showItemInFolder(filePath);
    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── IPC: Get webview contents ID ─────────────────────────────────────────────
ipcMain.handle('webview:getContentsId', async () => {
  // This is handled by the renderer sending it via IPC
  return null;
});

// ── IPC: Export PPTX with GIFs ──────────────────────────────────────────────
ipcMain.handle('ppt:exportWebview', async (_event, options) => {
  const { defaultName, webContentsId } = options || {};

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export as PPTX',
    defaultPath: defaultName ? `${defaultName}.pptx` : 'presentation.pptx',
    filters: [{ name: 'PowerPoint Presentation', extensions: ['pptx'] }],
  });

  if (canceled || !filePath) return { success: false, canceled: true };

  try {
    const { webContents } = require('electron');
    const wc = webContents.fromId(webContentsId);
    if (!wc) throw new Error('Preview webview not found');

    const pres = new PptxGenJS();
    pres.layout = 'LAYOUT_16x9';

    // Config
    const MAX_SLIDES = 100;
    const FRAMES_PER_SLIDE = 30; // 3 secs at 10 fps
    const FRAME_DELAY_MS = 100;
    
    const tmpDir = path.join(app.getPath('temp'), 'jsx-renderer-gifs');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    let lastSlideFirstFrameHash = null;

    // Wait slightly to make sure the webview is settled
    await new Promise(r => setTimeout(r, 500));

    for (let slideIndex = 0; slideIndex < MAX_SLIDES; slideIndex++) {
      mainWindow.webContents.send('status', `Recording slide ${slideIndex + 1}...`);
      
      let gifPath = path.join(tmpDir, `slide-${slideIndex}.gif`);
      
      let firstFrameImg = await wc.capturePage();
      const sz = firstFrameImg.getSize();
      
      const scale = Math.min(1600 / sz.width, 1);
      const targetW = Math.round(sz.width * scale);
      const targetH = Math.round(sz.height * scale);
      
      let firstFrameResized = firstFrameImg.resize({ width: targetW, height: targetH });
      const firstPng = PNG.sync.read(firstFrameResized.toPNG());
      let frameHash = 0;
      for (let i = 0; i < firstPng.data.length; i += 100) frameHash += firstPng.data[i];
      
      // If the first frame is identical to the first frame of the previous slide, we're done.
      if (lastSlideFirstFrameHash === frameHash) {
        break;
      }
      lastSlideFirstFrameHash = frameHash;
      
      let isAnimated = false;
      let usedPngPath = path.join(tmpDir, `slide-${slideIndex}.png`);
      fs.writeFileSync(usedPngPath, firstFrameResized.toPNG());

      const encoder = new GIFEncoder(targetW, targetH);
      const stream = fs.createWriteStream(gifPath);
      encoder.createReadStream().pipe(stream);
      
      encoder.start();
      encoder.setRepeat(0); 
      encoder.setDelay(FRAME_DELAY_MS);
      encoder.setQuality(5); // 1 = best colors/slowest, 10 = default. 5 is a much better balance.
      
      for (let frameIdx = 0; frameIdx < FRAMES_PER_SLIDE; frameIdx++) {
        const start = Date.now();
        const img = await wc.capturePage();
        const scImg = img.resize({ width: targetW, height: targetH });
        const png = PNG.sync.read(scImg.toPNG());
        
        encoder.addFrame(png.data);
        
        // Check for movement against the very first frame
        if (!isAnimated) {
          let diffSum = 0;
          for (let i = 0; i < firstPng.data.length; i += 100) {
            diffSum += Math.abs(firstPng.data[i] - png.data[i]);
          }
          if (diffSum > 500) { // Threshold for animation detection
            isAnimated = true;
          }
        }
        
        // If after 1 second (10 frames) we haven't seen any movement, it's a static slide. Abort GIF.
        if (frameIdx === 10 && !isAnimated) {
          mainWindow.webContents.send('status', `Slide ${slideIndex + 1} is static. Using PNG...`);
          break;
        }
        
        const elapsed = Date.now() - start;
        const waitTime = Math.max(0, FRAME_DELAY_MS - elapsed);
        if (waitTime > 0 && frameIdx < FRAMES_PER_SLIDE - 1) {
          await new Promise(r => setTimeout(r, waitTime));
        }
      }
      
      encoder.finish();
      await new Promise(r => stream.on('finish', r));
      
      let slide = pres.addSlide();
      if (isAnimated) {
        slide.addImage({ path: gifPath, x: 0, y: 0, w: '100%', h: '100%' });
      } else {
        slide.addImage({ path: usedPngPath, x: 0, y: 0, w: '100%', h: '100%' });
        try { fs.unlinkSync(gifPath); } catch(e){} // Cleanup the unused heavily compressed gif
      }
      
      // Advance
      await wc.executeJavaScript(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));`);
      
      // Wait for transition before capturing next slide
      await new Promise(r => setTimeout(r, 200));
    }
    
    mainWindow.webContents.send('status', `Saving PPTX file to disk...`);
    await pres.writeFile({ fileName: filePath });
    
    fs.rmSync(tmpDir, { recursive: true, force: true });
    shell.showItemInFolder(filePath);
    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  buildMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  watchers.forEach((w) => w.close());
  if (process.platform !== 'darwin') app.quit();
});

// ── Application menu ──────────────────────────────────────────────────────────
function buildMenu() {
  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'Open File…',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow.webContents.send('menu:openFile'),
        },
        { type: 'separator' },
        {
          label: 'Export as PDF…',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => mainWindow.webContents.send('menu:exportPDF'),
        },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'front' }],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
