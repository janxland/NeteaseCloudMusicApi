import type { ModuleQuery, ModuleRequest } from '../../types'

// 歌曲解灰

export default (query: ModuleQuery, request: ModuleRequest) => {
  const match = require('@unblockneteasemusic/server')
  /**
   * Set proxy or hosts if needed
   */
  // global.proxy = require('url').parse('http://127.0.0.1:1080');
  // global.hosts = { 'i.y.qq.com': '59.37.96.220' };
  /**
   * Find matching song from other platforms
   * @param {Number} id netease song id
   * @param {Array<String>||undefined} source support qq, xiami, baidu, kugou, kuwo, migu, joox
   * @return {Promise<Object>}
   */
  // if (!('MUSIC_U' in query.cookie))
  //   query.cookie._ntes_nuid = crypto.randomBytes(16).toString('hex')
  query.cookie.os = 'pc'
  const data: Record<string, any> = {
    ids: '[' + query.id + ']',
    br: parseInt(query.br || 999000),
  }
}
