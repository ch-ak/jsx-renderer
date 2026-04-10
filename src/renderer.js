/* global state */
const state = {
  files: [],        // { path, name, content }
  activeIndex: -1,
  zoom: 100,
  bg: 'dark',
  sidebarOpen: true,
  isResizing: false,
  webviewContentsId: null,
};

/* ── DOM refs ─────────────────────────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);

const sidebar         = $('sidebar');
const fileList        = $('fileList');
const emptyState      = $('emptyState');
const dropZone        = $('dropZone');
const webview         = $('previewWebview');
const titlebarTitle   = $('titlebarTitle');
const currentFileName = $('currentFileName');
const hotReloadBadge  = $('hotReloadBadge');
const statusMsg       = $('statusMsg');
const statusFileInfo  = $('statusFileInfo');
const zoomLevel       = $('zoomLevel');
const btnExportPDF    = $('btnExportPDF');
const btnExportPDFT   = $('btnExportPDFToolbar');
const btnExportPPT    = $('btnExportPPT');
const btnExportPPTT   = $('btnExportPPTToolbar');
const bgSelect        = $('bgSelect');

/* ── Webview setup ────────────────────────────────────────────────────────── */
webview.addEventListener('dom-ready', () => {
  state.webviewContentsId = webview.getWebContentsId();
  // Apply initial zoom
  applyZoom();
});

/* ── File management ──────────────────────────────────────────────────────── */
async function openFiles(paths) {
  for (const filePath of paths) {
    await addFile(filePath);
  }
}

async function addFile(filePath) {
  const name = filePath.split('/').pop();

  // Don't duplicate
  const existing = state.files.findIndex((f) => f.path === filePath);
  if (existing !== -1) {
    activateFile(existing);
    return;
  }

  const result = await window.electronAPI.readFile(filePath);
  if (!result.success) {
    setStatus(`Error reading file: ${result.error}`, 'error');
    return;
  }

  state.files.push({ path: filePath, name, content: result.content });
  await window.electronAPI.watchFile(filePath);
  renderSidebar();
  activateFile(state.files.length - 1);
}

function removeFile(index) {
  const file = state.files[index];
  if (file) window.electronAPI.unwatchFile(file.path);

  state.files.splice(index, 1);

  if (state.activeIndex === index) {
    const newIndex = Math.min(index, state.files.length - 1);
    state.activeIndex = -1;
    renderSidebar();
    if (newIndex >= 0) activateFile(newIndex);
    else showDropZone();
  } else {
    if (state.activeIndex > index) state.activeIndex--;
    renderSidebar();
  }
}

function activateFile(index) {
  state.activeIndex = index;
  const file = state.files[index];
  if (!file) return;

  titlebarTitle.textContent = file.name;
  currentFileName.textContent = file.name;
  hotReloadBadge.classList.add('visible');

  // Show webview, hide drop zone
  dropZone.classList.add('hidden');
  webview.style.display = 'flex';

  // Enable export buttons
  btnExportPDF.disabled = false;
  btnExportPDFT.disabled = false;
  btnExportPPT.disabled = false;
  btnExportPPTT.disabled = false;

  // Send the JSX to the preview
  sendToPreview(file.content, file.path);
  renderSidebar();
  setStatus(`Loaded ${file.name}`, 'success');
  statusFileInfo.textContent = `${(file.content.length / 1024).toFixed(1)} KB`;
}

function showDropZone() {
  dropZone.classList.remove('hidden');
  webview.style.display = 'none';
  titlebarTitle.textContent = 'JSX Renderer';
  currentFileName.textContent = 'No file open';
  hotReloadBadge.classList.remove('visible');
  btnExportPDF.disabled = true;
  btnExportPDFT.disabled = true;
  btnExportPPT.disabled = true;
  btnExportPPTT.disabled = true;
  statusFileInfo.textContent = '';
  setStatus('Ready', '');
}

/* ── Sidebar rendering ────────────────────────────────────────────────────── */
function renderSidebar() {
  // Clear non-empty-state children
  const items = fileList.querySelectorAll('.file-item');
  items.forEach((el) => el.remove());

  if (state.files.length === 0) {
    emptyState.style.display = '';
  } else {
    emptyState.style.display = 'none';
    state.files.forEach((file, i) => {
      const div = document.createElement('div');
      div.className = 'file-item' + (i === state.activeIndex ? ' active' : '');
      div.innerHTML = `
        <span class="file-item-icon">${getFileIcon(file.name)}</span>
        <div class="file-item-info">
          <div class="file-item-name">${file.name}</div>
          <div class="file-item-path">${shortenPath(file.path)}</div>
        </div>
        <button class="file-item-close" title="Close">×</button>
      `;
      div.addEventListener('click', (e) => {
        if (!e.target.classList.contains('file-item-close')) {
          activateFile(i);
        }
      });
      div.querySelector('.file-item-close').addEventListener('click', (e) => {
        e.stopPropagation();
        removeFile(i);
      });
      fileList.appendChild(div);
    });
  }
}

function getFileIcon(name) {
  if (name.endsWith('.jsx') || name.endsWith('.tsx')) return '⚛';
  if (name.endsWith('.js') || name.endsWith('.ts')) return '📜';
  return '📄';
}

function shortenPath(p) {
  const parts = p.split('/');
  if (parts.length <= 3) return p;
  return '…/' + parts.slice(-2).join('/');
}

/* ── Preview communication ─────────────────────────────────────────────────── */
function sendToPreview(jsxCode, filePath) {
  if (!webview) return;

  // Wait for webview to be ready then send via executeJavaScript
  const sendMsg = () => {
    try {
      webview.executeJavaScript(`
        window.renderJSX(${JSON.stringify(jsxCode)}, ${JSON.stringify(filePath)});
      `).catch((err) => {
        setStatus('Preview error: ' + err.message, 'error');
      });
    } catch (e) {
      setTimeout(sendMsg, 300);
    }
  };

  if (webview.style.display !== 'none') {
    sendMsg();
  } else {
    webview.addEventListener('dom-ready', sendMsg, { once: true });
  }
}

/* ── Zoom ─────────────────────────────────────────────────────────────────── */
function applyZoom() {
  if (webview) {
    try {
      webview.setZoomFactor(state.zoom / 100);
    } catch (_) { /* not ready yet */ }
  }
  zoomLevel.textContent = `${state.zoom}%`;
}

$('btnZoomIn').addEventListener('click', () => {
  state.zoom = Math.min(state.zoom + 10, 200);
  applyZoom();
});

$('btnZoomOut').addEventListener('click', () => {
  state.zoom = Math.max(state.zoom - 10, 25);
  applyZoom();
});

$('btnZoomReset').addEventListener('click', () => {
  state.zoom = 100;
  applyZoom();
});

/* ── Background selector ──────────────────────────────────────────────────── */
bgSelect.addEventListener('change', () => {
  state.bg = bgSelect.value;
  updatePreviewBg();
});

function updatePreviewBg() {
  const bgMap = { dark: '#0d0f16', light: '#f8fafc', transparent: 'transparent' };
  const bg = bgMap[state.bg] || '#0d0f16';
  if (webview) {
    webview.executeJavaScript(`document.body.style.background = ${JSON.stringify(bg)};`).catch(() => {});
  }
}

/* ── PDF Export ───────────────────────────────────────────────────────────── */
async function doExportPDF() {
  if (state.activeIndex < 0) return;
  const file = state.files[state.activeIndex];
  const defaultName = file.name.replace(/\.[^.]+$/, '');

  setStatus('Exporting PDF…', 'warning');

  // Use the preview webview's contents id for accurate PDF
  const result = await window.electronAPI.exportWebviewPDF({
    defaultName,
    webContentsId: state.webviewContentsId,
  });

  if (result.success) {
    setStatus(`PDF saved: ${result.filePath.split('/').pop()}`, 'success');
  } else if (result.canceled) {
    setStatus('Export cancelled', '');
  } else {
    setStatus(`PDF export failed: ${result.error}`, 'error');
  }
}

btnExportPDF.addEventListener('click', doExportPDF);
btnExportPDFT.addEventListener('click', doExportPDF);

/* ── PPT Export ───────────────────────────────────────────────────────────── */
async function doExportPPT() {
  if (state.activeIndex < 0) return;
  const file = state.files[state.activeIndex];
  const defaultName = file.name.replace(/\.[^.]+$/, '');

  setStatus('Exporting PPT with animations…', 'warning');

  const result = await window.electronAPI.exportWebviewPPT({
    defaultName,
    webContentsId: state.webviewContentsId,
  });

  if (result.success) {
    setStatus(`PPTX saved: ${result.filePath.split('/').pop()}`, 'success');
  } else if (result.canceled) {
    setStatus('Export cancelled', '');
  } else {
    setStatus(`PPTX export failed: ${result.error}`, 'error');
  }
}

btnExportPPT.addEventListener('click', doExportPPT);
btnExportPPTT.addEventListener('click', doExportPPT);

/* ── File open ────────────────────────────────────────────────────────────── */
async function doOpenFile() {
  const paths = await window.electronAPI.openFileDialog();
  if (paths && paths.length) openFiles(paths);
}

$('btnOpenFile').addEventListener('click', doOpenFile);
$('btnAddFile').addEventListener('click', doOpenFile);
$('dropOpenBtn').addEventListener('click', doOpenFile);

/* ── Sidebar toggle ─────────────────────────────────────────────────────────── */
$('btnToggleSidebar').addEventListener('click', () => {
  state.sidebarOpen = !state.sidebarOpen;
  sidebar.classList.toggle('collapsed', !state.sidebarOpen);
});

/* ── Sidebar resize ─────────────────────────────────────────────────────────── */
const resizeHandle = $('resizeHandle');
let resizeStartX = 0;
let resizeStartW = 0;

resizeHandle.addEventListener('mousedown', (e) => {
  state.isResizing = true;
  resizeStartX = e.clientX;
  resizeStartW = sidebar.offsetWidth;
  resizeHandle.classList.add('active');
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
});

document.addEventListener('mousemove', (e) => {
  if (!state.isResizing) return;
  const delta = e.clientX - resizeStartX;
  const newWidth = Math.max(160, Math.min(500, resizeStartW + delta));
  sidebar.style.width = newWidth + 'px';
});

document.addEventListener('mouseup', () => {
  if (!state.isResizing) return;
  state.isResizing = false;
  resizeHandle.classList.remove('active');
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
});

/* ── Drag and drop ────────────────────────────────────────────────────────── */
document.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

document.addEventListener('dragleave', (e) => {
  if (!e.relatedTarget) dropZone.classList.remove('drag-over');
});

document.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const files = Array.from(e.dataTransfer.files);
  const validExtensions = ['.jsx', '.js', '.tsx', '.ts'];
  const paths = files
    .filter((f) => validExtensions.some((ext) => f.name.endsWith(ext)))
    .map((f) => f.path);
  if (paths.length) openFiles(paths);
  else setStatus('Only .jsx, .js, .tsx, .ts files are supported', 'warning');
});

/* ── Hot reload: file changes ──────────────────────────────────────────────── */
window.electronAPI.onFileChanged((data) => {
  const index = state.files.findIndex((f) => f.path === data.path);
  if (index < 0) return;

  if (data.error) {
    setStatus(`File read error: ${data.error}`, 'error');
    return;
  }

  state.files[index].content = data.content;
  statusFileInfo.textContent = `${(data.content.length / 1024).toFixed(1)} KB`;

  if (index === state.activeIndex) {
    sendToPreview(data.content, data.path);
    setStatus(`Hot reloaded ${state.files[index].name}`, 'success');
  }
});

/* ── Menu & Status events ─────────────────────────────────────────────────── */
window.electronAPI.onMenuOpenFile(doOpenFile);
window.electronAPI.onMenuExportPDF(doExportPDF);
window.electronAPI.onStatusUpdate((msg) => {
  setStatus(msg, 'warning');
});

/* ── Status helper ────────────────────────────────────────────────────────── */
let statusTimer;
function setStatus(msg, type = '') {
  statusMsg.textContent = msg;
  statusMsg.className = 'status-msg' + (type ? ` ${type}` : '');
  clearTimeout(statusTimer);
  if (type === 'success') {
    statusTimer = setTimeout(() => {
      statusMsg.textContent = 'Ready';
      statusMsg.className = 'status-msg';
    }, 3000);
  }
}

/* ── Init ─────────────────────────────────────────────────────────────────── */
renderSidebar();
setStatus('Ready — drop a .jsx file or click Open to get started');
