import { Runtime } from 'foldkit'

import '@fontsource-variable/newsreader/opsz.css'
import '@fontsource-variable/newsreader/opsz-italic.css'
import { registerSW } from 'virtual:pwa-register'

import './styles.css'
import {
  Flags,
  Message,
  Model,
  flags,
  init,
  subscriptions,
  update,
  view,
} from './main'

const application = Runtime.makeApplication({
  Model,
  Flags,
  init,
  update,
  view,
  subscriptions,
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: request => Message.ClickedLink({ request }),
    onUrlChange: url => Message.ChangedUrl({ url }),
  },
  devTools: {
    Message,
  },
})

Runtime.run(application, { flags })

registerSW({ immediate: true })
