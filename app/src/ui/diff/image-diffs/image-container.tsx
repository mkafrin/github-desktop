import * as React from 'react'

import * as ipcRenderer from '../../../lib/ipc-renderer'

import { Image } from '../../../models/diff'

interface IImageProps {
  /** The image contents to render */
  readonly image: Image

  /** Optional styles to apply to the image container */
  readonly style?: React.CSSProperties

  /** callback to fire after the image has been loaded */
  readonly onElementLoad?: (img: HTMLImageElement) => void
}

interface IImageState {
  readonly imageSource: string | null
}

function areBuffersEqual(buf1: ArrayBufferLike, buf2: ArrayBufferLike) {
  if (buf1.byteLength != buf2.byteLength) return false
  var dv1 = new Int8Array(buf1)
  var dv2 = new Int8Array(buf2)
  for (var i = 0; i != buf1.byteLength; i++) {
    if (dv1[i] != dv2[i]) return false
  }
  return true
}

export class ImageContainer extends React.Component<IImageProps, IImageState> {
  public constructor(props: IImageProps) {
    super(props)
    this.state = {
      imageSource: null,
    }
  }

  public async convertDDSImage(
    contents: ArrayBufferLike
  ): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const listener = (
        _: Electron.IpcRendererEvent,
        responseContents: ArrayBufferLike,
        dataURL: string
      ) => {
        if (!areBuffersEqual(contents, responseContents)) return
        resolve(dataURL)
        ipcRenderer.removeListener('gpu-dataURL', listener)
      }
      ipcRenderer.on('gpu-dataURL', listener)
      ipcRenderer.send('convertDDSImage', contents)
    })
  }

  public async loadImage(image: Image) {
    if (image.mediaType === 'image/vnd-ms.dds') {
      try {
        const dataURL = await this.convertDDSImage(image.rawContents)
        this.setState({
          imageSource: dataURL,
        })
      } catch (error) {
        console.error('Error loading DDS image:', error)
        this.setState({ imageSource: null })
      }
    } else {
      this.setState({
        imageSource: `data:${image.mediaType};base64,${image.contents}`,
      })
    }
  }

  public componentDidMount() {
    const { image } = this.props
    this.loadImage(image)
  }

  public componentDidUpdate(prevProps: IImageProps) {
    const { image } = this.props
    if (image === prevProps.image) {
      return
    }

    this.loadImage(image)
  }

  public render() {
    const { imageSource } = this.state
    if (!imageSource) {
      return null
    }

    return (
      <div className="image-wrapper">
        <img
          src={imageSource}
          style={this.props.style}
          onLoad={this.onLoad}
          alt=""
        />
      </div>
    )
  }

  private onLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (this.props.onElementLoad) {
      this.props.onElementLoad(e.currentTarget)
    }
  }
}
