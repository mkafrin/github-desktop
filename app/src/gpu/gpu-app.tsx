import * as React from 'react'
import * as ipcRenderer from '../lib/ipc-renderer'
import { convertDDSImage } from './dds-converter'

// This is a weird one, let's leave it as a placeholder
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface IGPUAppProps {}

/**
 * The root component for our GPU process.
 *
 * The GPU process is responsible for rendering textures passed from
 * the main process or any renderer process to a canvas and returning them
 * as data URLs that can be loaded using an <img> element.
 */
export class GPUApp extends React.Component<IGPUAppProps> {
  public constructor(props: IGPUAppProps) {
    super(props)
  }

  public componentDidMount() {
    ipcRenderer.on('convertDDSImage', (_, contents: ArrayBufferLike) => {
      const dataURL = convertDDSImage(contents)
      ipcRenderer.send('gpu-dataURL', contents, dataURL)
    })

    ipcRenderer.send('gpu-ready')
  }

  public render() {
    return <div id="GPU-app"></div>
  }
}
