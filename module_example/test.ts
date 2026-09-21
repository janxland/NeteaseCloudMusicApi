import api from '../src/index'

const { banner, lyric } = api as any
banner({ type: 0 }).then((res) => {
  console.log(res)
})
lyric({
  id: '33894312',
}).then((res) => {
  console.log(res)
})
