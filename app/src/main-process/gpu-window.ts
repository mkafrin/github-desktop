import { BrowserWindow } from 'electron'
import { Emitter, Disposable } from 'event-kit'
import * as ipcMain from './ipc-main'
import * as ipcWebContents from './ipc-webcontents'
import { addTrustedIPCSender } from './trusted-ipc-sender'

const minWidth = 600
const minHeight = 500

/**
 * A wrapper around the BrowserWindow instance for our gpu process.
 *
 * The gpu process is responsible for rendering textures from a buffer
 * and passing them back as dataURLs that can be loaded into <img> elements.
 */
export class GPUWindow {
  private readonly window: Electron.BrowserWindow
  private readonly emitter = new Emitter()

  private hasFinishedLoading = false
  private hasSentReadyEvent = false

  public constructor() {
    const windowOptions: Electron.BrowserWindowConstructorOptions = {
      width: minWidth,
      height: minHeight,
      minWidth: minWidth,
      minHeight: minHeight,
      show: false,
      // This fixes subpixel aliasing on Windows
      // See https://github.com/atom/atom/commit/683bef5b9d133cb194b476938c77cc07fd05b972
      backgroundColor: '#fff',
      webPreferences: {
        // Disable auxclick event
        // See https://developers.google.com/web/updates/2016/10/auxclick
        disableBlinkFeatures: 'Auxclick',
        nodeIntegration: true,
        spellcheck: false,
        contextIsolation: false,
      },
    }

    if (__DARWIN__) {
      windowOptions.titleBarStyle = 'hidden'
    } else if (__WIN32__) {
      windowOptions.frame = false
    }

    this.window = new BrowserWindow(windowOptions)
    addTrustedIPCSender(this.window.webContents)
  }

  public load() {
    log.debug('Starting GPU process')

    // We only listen for the first of the loading events to avoid a bug in
    // Electron/Chromium where they can sometimes fire more than once. See
    // See
    // https://github.com/desktop/desktop/pull/513#issuecomment-253028277. This
    // shouldn't really matter as in production builds loading _should_ only
    // happen once.
    this.window.webContents.once('did-start-loading', () => {
      log.debug('GPU process in startup')
    })

    this.window.webContents.once('did-finish-load', () => {
      log.debug('GPU process started')
      this.hasFinishedLoading = true
      this.maybeEmitDidLoad()
    })

    this.window.webContents.on('did-fail-load', () => {
      log.error('GPU process failed to load')
      if (__DEV__) {
        this.window.webContents.openDevTools()
        this.window.show()
      } else {
        this.emitter.emit('did-fail-load', null)
      }
    })

    ipcMain.on('gpu-ready', () => {
      log.debug(`GPU process is ready`)

      this.hasSentReadyEvent = true
      this.maybeEmitDidLoad()
    })

    ipcMain.on('gpu-quit', () => {
      log.debug('Got quit signal from GPU process')
      this.window.close()
    })

    ipcMain.on('convertDDSImage', (_, contents) => {
      ipcWebContents.send(this.window.webContents, 'convertDDSImage', contents)
    })

    this.window.loadURL(`file://${__dirname}/gpu.html`)
  }

  /**
   * Emit the `onDidLoad` event if the page has loaded and the renderer has
   * signalled that it's ready.
   */
  private maybeEmitDidLoad() {
    if (this.hasFinishedLoading && this.hasSentReadyEvent) {
      this.emitter.emit('did-load', null)
    }
  }

  public onClose(fn: () => void) {
    this.window.on('closed', fn)
  }

  public onFailedToLoad(fn: () => void) {
    this.emitter.on('did-fail-load', fn)
  }

  /**
   * Register a function to call when the window is done loading. At that point
   * the page has loaded and the renderer has signalled that it is ready.
   */
  public onDidLoad(fn: () => void): Disposable {
    return this.emitter.on('did-load', fn)
  }

  public focus() {
    this.window.focus()
  }

  /** Show the window. */
  public show() {
    log.debug('Showing GPU process window')
    this.window.show()
  }

  public destroy() {
    this.window.destroy()
  }
}
