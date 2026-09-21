import { VERSION } from '../../core/version'
import type { ModuleQuery, ModuleRequest } from '../../types'

export default (query: ModuleQuery, request: ModuleRequest) => {
  return new Promise((resolve) => {
    return resolve({
      code: 200,
      status: 200,
      body: {
        code: 200,
        data: {
          version: VERSION,
        },
      },
    })
  })
}
