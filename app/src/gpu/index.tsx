import * as React from 'react'
import * as ReactDOM from 'react-dom'

import { GPUApp } from './gpu-app'

document.body.classList.add(`platform-${process.platform}`)

const container = document.createElement('div')
container.id = 'desktop-gpu-container'
document.body.appendChild(container)

ReactDOM.render(<GPUApp />, container)
